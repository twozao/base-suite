import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { env } from "$env/dynamic/private"
import { dev } from "$app/environment"
import { timingSafeEqual } from "../security/crypto"
import type { Db } from "../db"
import { nowIso, parseJson } from "../db/json"
import { keyFrom, open, seal } from "../security/secret_box"
import { getSettings, type Settings } from "../settings"
import {
  OAUTH_PROVIDERS,
  PROVIDER_INFO,
  type OAuthProviderId,
} from "$lib/signin_providers"

// Client secrets live in their own site_settings row. It is not in settingsSchema, so
// getSettings skips it and no page load can ever carry a secret to the browser.
const SECRETS_KEY = "oauth_secrets"
const KEY_FILE = "data/secrets.key"

type SigninSettings = Settings["signin"]
export type Credentials = {
  clientId: string
  clientSecret: string
  source: "env" | "admin"
}

const envCredentials = (id: OAuthProviderId) => {
  const prefix = `PRIVATE_${id.toUpperCase()}_CLIENT`
  const clientId = env[`${prefix}_ID`]
  const clientSecret = env[`${prefix}_SECRET`]
  return clientId && clientSecret ? { clientId, clientSecret } : null
}

/** Encryption key from PRIVATE_SECRETS_KEY, else a local file created on the first save. */
const encryptionKey = (create: boolean) => {
  if (env.PRIVATE_SECRETS_KEY) return keyFrom(env.PRIVATE_SECRETS_KEY)
  // A Worker has no disk to keep a key file on, so the key must come from a secret.
  if (__CLOUDFLARE__) {
    if (!create) return null
    throw new Error(
      "Set the PRIVATE_SECRETS_KEY secret to store keys on Cloudflare",
    )
  }
  try {
    return keyFrom(readFileSync(KEY_FILE))
  } catch {
    if (!create) return null
  }
  mkdirSync(KEY_FILE.slice(0, KEY_FILE.lastIndexOf("/")), { recursive: true })
  writeFileSync(KEY_FILE, keyFrom(crypto.randomUUID() + nowIso()), {
    mode: 0o600,
    flag: "wx",
  })
  return keyFrom(readFileSync(KEY_FILE))
}

/** Key material for other modules that store secrets; shares the same key file or environment variable. */
export const secretMaterial = () => encryptionKey(true)!.toString("hex")

const readBoxes = async (db: Db) => {
  const row = await db
    .selectFrom("site_settings")
    .select("value")
    .where("key", "=", SECRETS_KEY)
    .executeTakeFirst()
  return parseJson<Record<string, string>>(row?.value ?? "{}", {})
}

const storedSecret = async (db: Db, id: OAuthProviderId) => {
  const box = (await readBoxes(db))[id]
  const key = box ? encryptionKey(false) : null
  return box && key ? open(box, key, `oauth:${id}`) : null
}

/** Sets the secret, or removes it when null. Throws if no key can be stored; the caller explains. */
export const saveProviderSecret = async (
  db: Db,
  id: OAuthProviderId,
  secret: string | null,
  userId: string | null,
) => {
  const boxes = await readBoxes(db)
  if (secret) boxes[id] = seal(secret, encryptionKey(true)!, `oauth:${id}`)
  else delete boxes[id]
  const row = {
    value: JSON.stringify(boxes),
    updated_by: userId,
    updated_at: nowIso(),
  }
  await db
    .insertInto("site_settings")
    .values({ key: SECRETS_KEY, ...row })
    .onConflict((oc) => oc.column("key").doUpdateSet(row))
    .execute()
}

/** Environment variables win over the admin screen. Null until both id and secret exist. */
export const providerCredentials = async (
  db: Db,
  signin: SigninSettings,
  id: OAuthProviderId,
): Promise<Credentials | null> => {
  const fromEnv = envCredentials(id)
  if (fromEnv) return { ...fromEnv, source: "env" }
  const clientId = signin[id].clientId
  const clientSecret = clientId ? await storedSecret(db, id) : null
  return clientId && clientSecret
    ? { clientId, clientSecret, source: "admin" }
    : null
}

/** What the admin screen shows for a provider. Never includes the secret itself. */
export const providerStatus = async (db: Db, id: OAuthProviderId) => ({
  fromEnv: !!envCredentials(id),
  hasSecret: !!(await storedSecret(db, id)),
})

const needsOwner = async (db: Db) =>
  !(await db
    .selectFrom("user_roles")
    .select("user_id")
    .limit(1)
    .executeTakeFirst())

/**
 * How the first admin is made when there is none. Locally, the first account. Elsewhere, only someone
 * holding PRIVATE_SETUP_CODE, so a fresh deploy cannot be claimed by whoever finds it first.
 */
const ownerMode = () =>
  env.PRIVATE_SETUP_CODE ? "code" : dev ? "first" : "closed"

/** May this sign-up become the admin? Only while there is none, and with the setup code if one is set. */
export const ownerClaim = async (db: Db, code: string | null | undefined) => {
  if (!(await needsOwner(db))) return false
  const mode = ownerMode()
  if (mode === "first") return true
  if (mode === "code")
    return !!code && timingSafeEqual(code, env.PRIVATE_SETUP_CODE ?? "")
  return false
}

export type SigninPolicy = {
  enabled: boolean
  canSignUp: boolean
  password: boolean
  /** The sign-up form asks for the setup code, because this account can become the admin. */
  setupCode?: boolean
  providers: { id: OAuthProviderId; label: string }[]
}

/** What sign-in offers right now. A fresh install with no owner stays open so an admin can exist. */
export const signinPolicy = async (db: Db): Promise<SigninPolicy> => {
  const { signin } = await getSettings(db)
  const providers: SigninPolicy["providers"] = []
  for (const id of OAUTH_PROVIDERS) {
    if (signin[id].enabled && (await providerCredentials(db, signin, id)))
      providers.push({ id, label: PROVIDER_INFO[id].label })
  }
  // With no admin yet, sign-up stays open so one can be made, but only in a way ownerClaim accepts.
  if (ownerMode() !== "closed" && (await needsOwner(db)))
    return {
      enabled: true,
      canSignUp: true,
      password: true,
      providers,
      setupCode: ownerMode() === "code",
    }
  return {
    enabled: signin.enabled,
    canSignUp: signin.enabled && signin.allowSignUp,
    password: signin.password,
    providers,
  }
}

const isStaff = async (db: Db, userId: string) =>
  !!(await db
    .selectFrom("user_roles")
    .select("user_id")
    .where("user_id", "=", userId)
    .limit(1)
    .executeTakeFirst())

/** Staff can always sign in, so turning customer sign-in off never locks the owner out. */
export const maySignIn = async (db: Db, policy: SigninPolicy, userId: string) =>
  policy.enabled || (await isStaff(db, userId))

/** Rules that stop an admin locking everyone out. Returns the problem, or null when safe. */
export const signinChangeProblem = (
  next: SigninSettings,
  ctx: {
    configured: Record<OAuthProviderId, boolean>
    linked: OAuthProviderId[]
  },
): string | null => {
  for (const id of OAUTH_PROVIDERS) {
    if (next[id].enabled && !ctx.configured[id])
      return `${PROVIDER_INFO[id].label} needs a client ID and client secret before it can be turned on.`
  }
  if (next.password) return null
  const active = OAUTH_PROVIDERS.filter((id) => next[id].enabled)
  if (!active.length)
    return "Keep password sign-in on until a provider is turned on, or nobody could sign in."
  if (!active.some((id) => ctx.linked.includes(id)))
    return "Connect your own account to a turned-on provider in Account -> Settings first, or you would lock yourself out."
  return null
}
