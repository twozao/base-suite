import type { Cookies, RequestEvent } from "@sveltejs/kit"
import type { Db } from "../db"
import { nowIso } from "../db/json"
import { randomToken, sha256Hex, timingSafeEqual } from "../security/crypto"
import { openValue, sealValue } from "../security/vault"
import { createSession, setSessionCookie } from "./session"

// Authenticator-app codes (TOTP, RFC 6238: SHA-1, 30 seconds, 6 digits), one-time recovery codes,
// and the short-lived challenge between a correct password and the second step.

const STEP_S = 30
const DIGITS = 6
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
const SEAL_CONTEXT = (userId: string) => `totp:${userId}`
export const MFA_COOKIE = "mfa"
const CHALLENGE_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 5

export const base32Encode = (bytes: Uint8Array) => {
  let bits = 0
  let value = 0
  let out = ""
  for (const b of bytes) {
    value = (value << 8) | b
    bits += 8
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31]
  return out
}

export const base32Decode = (s: string) => {
  const clean = s.toUpperCase().replace(/[^A-Z2-7]/g, "")
  const out: number[] = []
  let bits = 0
  let value = 0
  for (const c of clean) {
    value = (value << 5) | B32.indexOf(c)
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return new Uint8Array(out)
}

/** The code for one time step. */
export const totpAt = async (secret: Uint8Array, step: number) => {
  const msg = new Uint8Array(8)
  let s = step
  for (let i = 7; i >= 0; i--) {
    msg[i] = s & 255
    s = Math.floor(s / 256)
  }
  const key = await crypto.subtle.importKey(
    "raw",
    secret,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  )
  const h = new Uint8Array(await crypto.subtle.sign("HMAC", key, msg))
  const o = h[h.length - 1] & 15
  const n = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]
  return String(n % 10 ** DIGITS).padStart(DIGITS, "0")
}

/** The matching time step for a code, one step either side allowed for clock drift; null when wrong. */
export const verifyTotp = async (
  secret: Uint8Array,
  code: string,
  now = Date.now(),
) => {
  const c = code.replace(/\s/g, "")
  if (!/^\d{6}$/.test(c)) return null
  const step = Math.floor(now / 1000 / STEP_S)
  for (const s of [step, step - 1, step + 1]) {
    if (timingSafeEqual(await totpAt(secret, s), c)) return s
  }
  return null
}

export const totpUri = (secretB32: string, account: string, issuer: string) =>
  `otpauth://totp/${encodeURIComponent(`${issuer}:${account}`)}?secret=${secretB32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`

/** Starts setup: a new secret, stored sealed and not yet enabled. Returns it for the QR code. */
export const beginTotpSetup = async (db: Db, userId: string) => {
  const raw = new Uint8Array(20)
  crypto.getRandomValues(raw)
  const b32 = base32Encode(raw)
  const sealed = sealValue(b32, SEAL_CONTEXT(userId))
  await db
    .insertInto("user_totp")
    .values({ user_id: userId, secret: sealed, enabled_at: null })
    .onConflict((oc) =>
      oc
        .column("user_id")
        .doUpdateSet({ secret: sealed, enabled_at: null, last_step: 0 }),
    )
    .execute()
  return b32
}

const secretFor = async (db: Db, userId: string) => {
  const row = await db
    .selectFrom("user_totp")
    .select(["secret", "enabled_at", "last_step"])
    .where("user_id", "=", userId)
    .executeTakeFirst()
  if (!row) return null
  const b32 = openValue(row.secret, SEAL_CONTEXT(userId))
  return b32
    ? {
        secret: base32Decode(b32),
        enabled: !!row.enabled_at,
        lastStep: row.last_step,
      }
    : null
}

/** Checks a code and records its time step, so the same code cannot be used twice. */
export const checkTotp = async (
  db: Db,
  userId: string,
  code: string,
  requireEnabled = true,
) => {
  const s = await secretFor(db, userId)
  if (!s || (requireEnabled && !s.enabled)) return false
  const step = await verifyTotp(s.secret, code)
  if (step === null || step <= s.lastStep) return false
  await db
    .updateTable("user_totp")
    .set({ last_step: step })
    .where("user_id", "=", userId)
    .execute()
  return true
}

export const enableTotp = (db: Db, userId: string) =>
  db
    .updateTable("user_totp")
    .set({ enabled_at: nowIso() })
    .where("user_id", "=", userId)
    .execute()

export const disableTotp = async (db: Db, userId: string) => {
  await db.deleteFrom("user_totp").where("user_id", "=", userId).execute()
  await db
    .deleteFrom("user_recovery_codes")
    .where("user_id", "=", userId)
    .execute()
}

/** Ten new recovery codes; earlier ones stop working. Only their hashes are kept. */
export const newRecoveryCodes = async (db: Db, userId: string) => {
  const codes = Array.from({ length: 10 }, () => {
    const t = randomToken(8)
      .replace(/[^A-Za-z0-9]/g, "")
      .toLowerCase()
      .padEnd(10, "x")
    return `${t.slice(0, 5)}-${t.slice(5, 10)}`
  })
  await db
    .deleteFrom("user_recovery_codes")
    .where("user_id", "=", userId)
    .execute()
  for (const c of codes)
    await db
      .insertInto("user_recovery_codes")
      .values({ user_id: userId, code_hash: await sha256Hex(c) })
      .execute()
  return codes
}

export const useRecoveryCode = async (db: Db, userId: string, code: string) => {
  const hash = await sha256Hex(code.trim().toLowerCase())
  const res = await db
    .updateTable("user_recovery_codes")
    .set({ used_at: nowIso() })
    .where("user_id", "=", userId)
    .where("code_hash", "=", hash)
    .where("used_at", "is", null)
    .executeTakeFirst()
  return Number(res.numUpdatedRows) > 0
}

/** What second steps a user has set up. */
export const secondFactors = async (db: Db, userId: string) => {
  const [totp, passkeys, codes] = await Promise.all([
    db
      .selectFrom("user_totp")
      .select("enabled_at")
      .where("user_id", "=", userId)
      .executeTakeFirst(),
    db
      .selectFrom("user_passkeys")
      .select((eb) => eb.fn.countAll<number>().as("n"))
      .where("user_id", "=", userId)
      .executeTakeFirst(),
    db
      .selectFrom("user_recovery_codes")
      .select((eb) => eb.fn.countAll<number>().as("n"))
      .where("user_id", "=", userId)
      .where("used_at", "is", null)
      .executeTakeFirst(),
  ])
  return {
    totp: !!totp?.enabled_at,
    passkeys: Number(passkeys?.n ?? 0),
    recoveryLeft: Number(codes?.n ?? 0),
  }
}

type Ev = Pick<RequestEvent, "locals" | "cookies" | "url"> & {
  request?: Request
}

const openSession = async (event: Ev, userId: string, mfa: boolean) => {
  const { token, expiresAt } = await createSession(event.locals.db, userId, {
    mfa,
    userAgent: event.request?.headers?.get("user-agent") ?? null,
  })
  setSessionCookie(
    event.cookies,
    token,
    expiresAt,
    event.url.protocol === "https:",
  )
}

/** After a correct password or provider sign-in: opens the session, or asks for the second step first. */
export const finishFirstStep = async (
  event: Ev,
  userId: string,
  next: string,
) => {
  // Any second step the user set up (app or passkey) is asked for after the password.
  const f = await secondFactors(event.locals.db, userId)
  if (!f.totp && !f.passkeys) {
    await openSession(event, userId, false)
    return next
  }
  const token = randomToken()
  await event.locals.db
    .insertInto("mfa_challenges")
    .values({
      token_hash: await sha256Hex(token),
      user_id: userId,
      next_path: next.slice(0, 500),
      expires_at: new Date(Date.now() + CHALLENGE_MS).toISOString(),
    })
    .execute()
  setChallengeCookie(event.cookies, token, event.url.protocol === "https:")
  return "/login/two_factor"
}

const setChallengeCookie = (cookies: Cookies, token: string, secure: boolean) =>
  cookies.set(MFA_COOKIE, token, {
    path: "/login",
    httpOnly: true,
    sameSite: "lax",
    secure,
    maxAge: CHALLENGE_MS / 1000,
  })

/** The pending challenge for this browser, if still valid. */
export const pendingChallenge = async (event: Ev) => {
  const token = event.cookies.get(MFA_COOKIE)
  if (!token || token.length > 100) return null
  const hash = await sha256Hex(token)
  const row = await event.locals.db
    .selectFrom("mfa_challenges")
    .select(["user_id", "next_path", "attempts", "expires_at"])
    .where("token_hash", "=", hash)
    .executeTakeFirst()
  if (
    !row ||
    Date.parse(row.expires_at) < Date.now() ||
    row.attempts >= MAX_ATTEMPTS
  )
    return null
  return { hash, userId: row.user_id, next: row.next_path ?? "/account" }
}

/** Second step: an authenticator code or a recovery code. Opens the session when right. */
export const completeChallenge = async (event: Ev, code: string) => {
  const c = await pendingChallenge(event)
  if (!c) return { ok: false as const, expired: true }
  const db = event.locals.db
  // Count the attempt before checking, in one statement, so parallel guesses cannot pass the limit.
  const counted = await db
    .updateTable("mfa_challenges")
    .set((eb) => ({ attempts: eb("attempts", "+", 1) }))
    .where("token_hash", "=", c.hash)
    .where("attempts", "<", MAX_ATTEMPTS)
    .executeTakeFirst()
  if (Number(counted.numUpdatedRows) === 0)
    return { ok: false as const, expired: true }
  const ok = /^\d{6}$/.test(code.replace(/\s/g, ""))
    ? await checkTotp(db, c.userId, code)
    : await useRecoveryCode(db, c.userId, code)
  if (!ok) return { ok: false as const, expired: false }
  await db
    .deleteFrom("mfa_challenges")
    .where("token_hash", "=", c.hash)
    .execute()
  event.cookies.delete(MFA_COOKIE, { path: "/login" })
  await openSession(event, c.userId, true)
  return { ok: true as const, next: c.next, userId: c.userId }
}

/** Opens a session after a passkey sign-in, which counts as both steps, and ends any pending challenge. */
export const passkeySession = async (event: Ev, userId: string) => {
  const c = await pendingChallenge(event)
  if (c) {
    await event.locals.db
      .deleteFrom("mfa_challenges")
      .where("token_hash", "=", c.hash)
      .execute()
    event.cookies.delete(MFA_COOKIE, { path: "/login" })
  }
  await openSession(event, userId, true)
}

/** Marks the current session as having used a second step, after the user just proved one. */
export const markSessionMfa = (db: Db, sessionId: string | undefined) =>
  sessionId
    ? db
        .updateTable("sessions")
        .set({ mfa: 1 })
        .where("id", "=", sessionId)
        .execute()
    : Promise.resolve()

/** True when TOTP is already on, so a new setup must not replace it. */
export const totpEnabled = async (db: Db, userId: string) =>
  !!(
    await db
      .selectFrom("user_totp")
      .select("enabled_at")
      .where("user_id", "=", userId)
      .executeTakeFirst()
  )?.enabled_at
