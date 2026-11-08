import type { Cookies, RequestEvent } from "@sveltejs/kit"
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server"
import type { Db } from "../db"
import { nowIso, parseStringList } from "../db/json"
import { randomToken, sha256Hex } from "../security/crypto"

// Passkeys (WebAuthn): sign in with the device's fingerprint, face or PIN instead of a password.
// A passkey sign-in counts as both steps. The challenge lives server-side, keyed by a cookie.

const COOKIE = "pk_challenge"
const TTL_MS = 5 * 60 * 1000

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
const fromB64url = (s: string) => {
  const b = atob(
    s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4),
  )
  return Uint8Array.from(b, (c) => c.charCodeAt(0))
}

type Ev = Pick<RequestEvent, "locals" | "cookies" | "url">

const rp = (url: URL) => ({ rpID: url.hostname, origin: url.origin })

const saveChallenge = async (
  event: Ev,
  challenge: string,
  purpose: "register" | "signin",
  userId: string | null,
) => {
  const token = randomToken()
  await event.locals.db
    .insertInto("passkey_challenges")
    .values({
      token_hash: await sha256Hex(token),
      challenge,
      user_id: userId,
      purpose,
      expires_at: new Date(Date.now() + TTL_MS).toISOString(),
    })
    .execute()
  event.cookies.set(COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: event.url.protocol === "https:",
    maxAge: TTL_MS / 1000,
  })
}

/** Takes the challenge once; it cannot be reused. */
const takeChallenge = async (event: Ev, purpose: "register" | "signin") => {
  const token = event.cookies.get(COOKIE)
  event.cookies.delete(COOKIE, { path: "/" })
  if (!token || token.length > 100) return null
  const hash = await sha256Hex(token)
  const row = await event.locals.db
    .selectFrom("passkey_challenges")
    .select(["challenge", "user_id", "purpose", "expires_at"])
    .where("token_hash", "=", hash)
    .executeTakeFirst()
  await event.locals.db
    .deleteFrom("passkey_challenges")
    .where("token_hash", "=", hash)
    .execute()
  if (
    !row ||
    row.purpose !== purpose ||
    Date.parse(row.expires_at) < Date.now()
  )
    return null
  return row
}

export const listPasskeys = (db: Db, userId: string) =>
  db
    .selectFrom("user_passkeys")
    .select(["id", "name", "created_at", "last_used_at"])
    .where("user_id", "=", userId)
    .orderBy("created_at")
    .execute()

export const registrationOptions = async (
  event: Ev,
  user: { id: string; email: string },
  siteName: string,
) => {
  const existing = await event.locals.db
    .selectFrom("user_passkeys")
    .select(["id", "transports"])
    .where("user_id", "=", user.id)
    .execute()
  const options = await generateRegistrationOptions({
    rpName: siteName,
    rpID: rp(event.url).rpID,
    userName: user.email,
    userID: new TextEncoder().encode(user.id) as Uint8Array<ArrayBuffer>,
    attestationType: "none",
    excludeCredentials: existing.map((c) => ({
      id: c.id,
      transports: parseStringList(
        c.transports,
      ) as AuthenticatorTransportFuture[],
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "required",
    },
  })
  await saveChallenge(event, options.challenge, "register", user.id)
  return options
}

export const finishRegistration = async (
  event: Ev,
  userId: string,
  response: RegistrationResponseJSON,
  name: string,
) => {
  const c = await takeChallenge(event, "register")
  if (!c || c.user_id !== userId)
    return { error: "The request expired. Try again." }
  const { rpID, origin } = rp(event.url)
  let verified
  try {
    verified = await verifyRegistrationResponse({
      response,
      expectedChallenge: c.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    })
  } catch {
    return { error: "The passkey could not be checked" }
  }
  if (!verified.verified || !verified.registrationInfo)
    return { error: "The passkey could not be checked" }
  const cred = verified.registrationInfo.credential
  await event.locals.db
    .insertInto("user_passkeys")
    .values({
      id: cred.id,
      user_id: userId,
      public_key: b64url(cred.publicKey),
      counter: cred.counter,
      transports: JSON.stringify(cred.transports ?? []),
      name: name.trim().slice(0, 80) || "Passkey",
    })
    .execute()
  return { ok: true as const }
}

export const signInOptions = async (event: Ev) => {
  const options = await generateAuthenticationOptions({
    rpID: rp(event.url).rpID,
    userVerification: "required",
  })
  await saveChallenge(event, options.challenge, "signin", null)
  return options
}

/** The user id for a valid passkey answer, or null. */
export const finishSignIn = async (
  event: Ev,
  response: AuthenticationResponseJSON,
) => {
  const c = await takeChallenge(event, "signin")
  if (!c) return null
  const db = event.locals.db
  const stored = await db
    .selectFrom("user_passkeys")
    .select(["id", "user_id", "public_key", "counter", "transports"])
    .where("id", "=", String(response.id).slice(0, 512))
    .executeTakeFirst()
  if (!stored) return null
  const { rpID, origin } = rp(event.url)
  let result
  try {
    result = await verifyAuthenticationResponse({
      response,
      expectedChallenge: c.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: {
        id: stored.id,
        publicKey: fromB64url(stored.public_key),
        counter: stored.counter,
        transports: parseStringList(
          stored.transports,
        ) as AuthenticatorTransportFuture[],
      },
    })
  } catch {
    return null
  }
  if (!result.verified) return null
  await db
    .updateTable("user_passkeys")
    .set({
      counter: result.authenticationInfo.newCounter,
      last_used_at: nowIso(),
    })
    .where("id", "=", stored.id)
    .execute()
  return stored.user_id
}

export const clearPasskeyCookie = (cookies: Cookies) =>
  cookies.delete(COOKIE, { path: "/" })
