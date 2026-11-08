import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Db } from "../db"
import { createTestDb } from "../db/test_db"
import { getSettings, invalidateSettings, saveSetting } from "../settings"
import { keyFrom, open, seal } from "../security/secret_box"
import { fetchProfile, authorizeUrl, type OAuthProfile } from "./oauth"
import {
  linkToUser,
  linkedProviders,
  resolveOAuthUser,
  unlinkProvider,
} from "./oauth_accounts"
import {
  maySignIn,
  providerCredentials,
  saveProviderSecret,
  signinChangeProblem,
  signinPolicy,
} from "./signin"
import { createUser, hasPassword } from "./users"
import { GET as callback } from "../../../routes/(marketing)/auth/oauth/[provider]/callback/+server"
import { FLOW_COOKIE } from "../../../routes/(marketing)/auth/oauth/[provider]/flow.server"

vi.mock("$env/dynamic/private", () => ({
  env: { PRIVATE_SECRETS_KEY: "test-key-material" },
}))

let db: Db
beforeEach(async () => {
  invalidateSettings()
  db = await createTestDb()
})

const profile = (over: Partial<OAuthProfile> = {}): OAuthProfile => ({
  provider: "google",
  subject: "sub-1",
  email: "ann@example.com",
  emailVerified: true,
  name: "Ann",
  ...over,
})
const open_ = { canSignUp: true, password: true }
const signinOn = {
  enabled: true,
  allowSignUp: true,
  password: true,
  google: { enabled: true, clientId: "gid" },
  github: { enabled: false, clientId: "" },
}
const owner = async () => {
  const r = await createUser(db, {
    email: "owner@example.com",
    password: "pw-pw-pw",
    claimOwner: true,
  })
  return (r as { user: { id: string } }).user.id
}

describe("secret box", () => {
  const key = keyFrom("k")
  it("opens only with the same key and context", () => {
    const box = seal("s3cret", key, "oauth:google")
    expect(box).not.toContain("s3cret")
    expect(open(box, key, "oauth:google")).toBe("s3cret")
    expect(open(box, key, "oauth:github")).toBeNull()
    expect(open(box, keyFrom("other"), "oauth:google")).toBeNull()
    expect(open("v1:garbage", key, "oauth:google")).toBeNull()
  })
})

describe("provider secrets", () => {
  it("are stored encrypted and never appear in getSettings", async () => {
    await owner()
    await saveSetting(db, "signin", signinOn, null)
    await saveProviderSecret(db, "google", "top-secret", null)
    const row = await db
      .selectFrom("site_settings")
      .select("value")
      .where("key", "=", "oauth_secrets")
      .executeTakeFirstOrThrow()
    expect(row.value).not.toContain("top-secret")
    expect(JSON.stringify(await getSettings(db))).not.toContain("top-secret")
    const creds = await providerCredentials(db, signinOn, "google")
    expect(creds).toEqual({
      clientId: "gid",
      clientSecret: "top-secret",
      source: "admin",
    })
    await saveProviderSecret(db, "google", null, null)
    expect(await providerCredentials(db, signinOn, "google")).toBeNull()
  })
})

describe("sign-in policy", () => {
  it("stays open until an owner exists, whatever the settings say", async () => {
    await saveSetting(
      db,
      "signin",
      { ...signinOn, enabled: false, allowSignUp: false, password: false },
      null,
    )
    expect(await signinPolicy(db)).toMatchObject({
      enabled: true,
      canSignUp: true,
      password: true,
    })
    await owner()
    invalidateSettings()
    expect(await signinPolicy(db)).toMatchObject({
      enabled: false,
      canSignUp: false,
      password: false,
    })
  })
  it("only offers a provider that is on and has both keys", async () => {
    await owner()
    await saveSetting(db, "signin", signinOn, null)
    expect((await signinPolicy(db)).providers).toEqual([])
    await saveProviderSecret(db, "google", "s", null)
    expect((await signinPolicy(db)).providers).toEqual([
      { id: "google", label: "Google" },
    ])
  })
  it("lets staff but not customers sign in while closed", async () => {
    const admin = await owner()
    const r = await createUser(db, {
      email: "c@example.com",
      password: "pw-pw-pw",
    })
    const customer = (r as { user: { id: string } }).user.id
    const closed = {
      enabled: false,
      canSignUp: false,
      password: true,
      providers: [],
    }
    expect(await maySignIn(db, closed, admin)).toBe(true)
    expect(await maySignIn(db, closed, customer)).toBe(false)
  })
})

describe("lockout rules", () => {
  const ctx = (configured: boolean, linked: ("google" | "github")[] = []) => ({
    configured: { google: configured, github: false },
    linked,
  })
  it("refuses a provider without keys", () => {
    expect(signinChangeProblem(signinOn, ctx(false))).toMatch(/client ID/)
  })
  it("refuses password off with no provider", () => {
    const next = {
      ...signinOn,
      password: false,
      google: { enabled: false, clientId: "" },
    }
    expect(signinChangeProblem(next, ctx(true))).toMatch(/Keep password/)
  })
  it("refuses password off until the admin is connected", () => {
    const next = { ...signinOn, password: false }
    expect(signinChangeProblem(next, ctx(true))).toMatch(/lock yourself out/)
    expect(signinChangeProblem(next, ctx(true, ["google"]))).toBeNull()
  })
})

describe("resolving an identity", () => {
  it("creates a verified account with no password, and never an admin", async () => {
    const r = await resolveOAuthUser(db, profile(), open_)
    if (!r.ok) throw new Error(r.reason)
    expect(await hasPassword(db, r.userId)).toBe(false)
    const roles = await db
      .selectFrom("user_roles")
      .select("role")
      .where("user_id", "=", r.userId)
      .execute()
    expect(roles).toEqual([])
    const again = await resolveOAuthUser(
      db,
      profile({ email: "changed@example.com" }),
      open_,
    )
    expect(again).toEqual({ ok: true, userId: r.userId })
  })
  it("will not join an account holding a password, so a planted password cannot take it over", async () => {
    await createUser(db, { email: "ann@example.com", password: "attacker-pw" })
    expect(await resolveOAuthUser(db, profile(), open_)).toEqual({
      ok: false,
      reason: "account_exists",
    })
  })
  it("joins and drops the old password when password sign-in is off", async () => {
    const r = await createUser(db, {
      email: "ann@example.com",
      password: "old-pw-old",
    })
    const id = (r as { user: { id: string } }).user.id
    const out = await resolveOAuthUser(db, profile(), {
      canSignUp: false,
      password: false,
    })
    expect(out).toEqual({ ok: true, userId: id })
    expect(await hasPassword(db, id)).toBe(false)
  })
  it("joins two providers on a passwordless account", async () => {
    const a = await resolveOAuthUser(db, profile(), open_)
    const b = await resolveOAuthUser(
      db,
      profile({ provider: "github", subject: "9" }),
      open_,
    )
    expect(b).toEqual(a)
  })
  it("refuses an unverified email and a closed sign-up", async () => {
    expect(
      await resolveOAuthUser(db, profile({ emailVerified: false }), open_),
    ).toEqual({ ok: false, reason: "email_unverified" })
    expect(
      await resolveOAuthUser(db, profile(), {
        canSignUp: false,
        password: true,
      }),
    ).toEqual({ ok: false, reason: "signup_closed" })
  })
})

describe("connecting and disconnecting", () => {
  it("refuses an identity owned by someone else", async () => {
    const a = await owner()
    const r = await createUser(db, {
      email: "b@example.com",
      password: "pw-pw-pw",
    })
    const b = (r as { user: { id: string } }).user.id
    expect(await linkToUser(db, profile(), a)).toEqual({ ok: true })
    expect(await linkToUser(db, profile(), b)).toEqual({
      ok: false,
      reason: "linked_elsewhere",
    })
  })
  it("keeps the last way back in", async () => {
    const r = await resolveOAuthUser(db, profile(), open_)
    if (!r.ok) throw new Error(r.reason)
    expect((await unlinkProvider(db, r.userId, "google")).ok).toBe(false)
    expect(await linkedProviders(db, r.userId)).toEqual(["google"])
    const a = await owner()
    await linkToUser(db, profile({ subject: "x" }), a)
    expect((await unlinkProvider(db, a, "google")).ok).toBe(true)
  })
})

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
const creds = { clientId: "id", clientSecret: "sec", source: "admin" as const }
const input = { code: "c", verifier: "v", redirectUri: "https://x/cb" }

describe("provider responses", () => {
  it("reads a Google identity and honours email_verified", async () => {
    const f = vi.fn(async (url: RequestInfo | URL) =>
      String(url).includes("token")
        ? json({ access_token: "t" })
        : json({ sub: "1", email: "a@b.co", email_verified: false, name: "A" }),
    ) as unknown as typeof fetch
    expect(await fetchProfile("google", creds, input, f)).toEqual({
      provider: "google",
      subject: "1",
      email: "a@b.co",
      emailVerified: false,
      name: "A",
    })
  })
  it("takes GitHub's primary verified email, since the profile email is optional", async () => {
    const f = vi.fn(async (url: RequestInfo | URL) => {
      const u = String(url)
      if (u.includes("access_token")) return json({ access_token: "t" })
      if (u.endsWith("/user")) return json({ id: 7, name: null })
      return json([
        { email: "old@b.co", primary: false, verified: true },
        { email: "main@b.co", primary: true, verified: true },
      ])
    }) as unknown as typeof fetch
    expect(await fetchProfile("github", creds, input, f)).toMatchObject({
      subject: "7",
      email: "main@b.co",
      emailVerified: true,
    })
  })
  it("fails on a provider error or a body with no token", async () => {
    await expect(
      fetchProfile("google", creds, input, (async () =>
        json({}, 401)) as typeof fetch),
    ).rejects.toThrow(/401/)
    await expect(
      fetchProfile("google", creds, input, (async () =>
        json({ error: "bad" })) as typeof fetch),
    ).rejects.toThrow()
  })
  it("builds an authorize URL with state and an S256 challenge, never the secret", async () => {
    const u = new URL(
      await authorizeUrl("github", creds, "https://x/cb", {
        state: "st",
        verifier: "ver",
      }),
    )
    expect(u.origin).toBe("https://github.com")
    expect(u.searchParams.get("state")).toBe("st")
    expect(u.searchParams.get("code_challenge_method")).toBe("S256")
    expect(u.toString()).not.toContain("sec")
    expect(u.searchParams.get("code_challenge")).not.toBe("ver")
  })
})

describe("callback route", () => {
  const flow = (over = {}) =>
    btoa(
      JSON.stringify({
        provider: "google",
        state: "good",
        verifier: "v",
        next: "/account/billing",
        linkUserId: null,
        ...over,
      }),
    )
  const event = (
    query: string,
    cookie: string | undefined,
    user: unknown = null,
  ) => {
    const jar = new Map<string, string>()
    return {
      jar,
      ev: {
        params: { provider: "google" },
        url: new URL(`https://site.test/auth/oauth/google/callback?${query}`),
        locals: { db, user, session: null },
        cookies: {
          get: (k: string) => (k === FLOW_COOKIE ? cookie : undefined),
          set: (k: string, v: string) => jar.set(k, v),
          delete: (k: string) => jar.delete(k),
        },
      },
    }
  }
  const run = async (e: unknown) => {
    try {
      await callback(e as Parameters<typeof callback>[0])
    } catch (r) {
      return (r as { location: string }).location
    }
    throw new Error("expected a redirect")
  }
  const ready = async () => {
    await owner()
    await saveSetting(db, "signin", signinOn, null)
    await saveProviderSecret(db, "google", "s", null)
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: RequestInfo | URL) =>
        String(url).includes("token")
          ? json({ access_token: "t" })
          : json({
              sub: "g1",
              email: "new@example.com",
              email_verified: true,
              name: "New",
            }),
      ),
    )
  }

  it("rejects a missing or wrong state without calling the provider", async () => {
    await ready()
    expect(await run(event("state=evil&code=c", flow()).ev)).toContain(
      "oauth_error=state",
    )
    expect(await run(event("state=good&code=c", undefined).ev)).toContain(
      "oauth_error=state",
    )
    expect(fetch).not.toHaveBeenCalled()
  })
  it("treats a provider refusal as cancelled", async () => {
    await ready()
    expect(
      await run(event("state=good&error=access_denied", flow()).ev),
    ).toContain("oauth_error=denied")
  })
  it("signs in, creates the account and returns to next", async () => {
    await ready()
    const { ev, jar } = event("state=good&code=c", flow())
    expect(await run(ev)).toBe("/account/billing")
    expect(jar.has("session")).toBe(true)
    const row = await db
      .selectFrom("users")
      .select("email_verified")
      .where("email", "=", "new@example.com")
      .executeTakeFirstOrThrow()
    expect(row.email_verified).toBe(1)
  })
  it("will not finish a connect flow for a different signed-in user", async () => {
    await ready()
    const { ev } = event(
      "state=good&code=c",
      flow({ linkUserId: "someone-else" }),
      { id: "me" },
    )
    expect(await run(ev)).toContain("oauth_error=state")
    expect(
      await db.selectFrom("oauth_accounts").select("subject").execute(),
    ).toEqual([])
  })
})

describe("first admin", () => {
  it("is the first sign-up locally, and only with the setup code when one is set", async () => {
    const { ownerClaim } = await import("./signin")
    const { env } = await import("$env/dynamic/private")
    expect(await ownerClaim(db, null)).toBe(true)
    env.PRIVATE_SETUP_CODE = "setup-code-for-test"
    try {
      expect(await ownerClaim(db, null)).toBe(false)
      expect(await ownerClaim(db, "wrong")).toBe(false)
      expect(await ownerClaim(db, "setup-code-for-test")).toBe(true)
      await owner()
      expect(await ownerClaim(db, "setup-code-for-test")).toBe(false)
    } finally {
      delete env.PRIVATE_SETUP_CODE
    }
  })
})
