import type { Cookies } from "@sveltejs/kit"
import type { Db } from "../db"
import { randomToken, sha256Hex } from "../security/crypto"

export const SESSION_COOKIE = "session"
const SESSION_MS = 30 * 24 * 60 * 60 * 1000
const RENEW_BEFORE_MS = SESSION_MS / 2

export type SessionUser = {
  id: string
  email: string
  emailVerified: boolean
  createdAt: string
}
export type SessionInfo = { id: string; expiresAt: string; mfa: boolean }
const SEEN_EVERY_MS = 10 * 60 * 1000

// The browser holds a random token; only its SHA-256 is stored, so a database read cannot be replayed as a login.
export const createSession = async (
  db: Db,
  userId: string,
  opts: { mfa?: boolean; userAgent?: string | null } = {},
) => {
  const token = randomToken()
  const expiresAt = new Date(Date.now() + SESSION_MS).toISOString()
  await db
    .insertInto("sessions")
    .values({
      id: await sha256Hex(token),
      user_id: userId,
      expires_at: expiresAt,
      mfa: opts.mfa ? 1 : 0,
      user_agent: opts.userAgent?.slice(0, 300) ?? null,
      last_seen_at: new Date().toISOString(),
    })
    .execute()
  return { token, expiresAt }
}

/** Resolves a cookie token to its user; expired sessions are removed, sessions past half-life are extended. */
export const validateSession = async (
  db: Db,
  token: string | undefined,
): Promise<{
  session: SessionInfo
  user: SessionUser
  renewed: boolean
} | null> => {
  if (!token || token.length > 100) return null
  const id = await sha256Hex(token)
  const row = await db
    .selectFrom("sessions")
    .innerJoin("users", "users.id", "sessions.user_id")
    .select([
      "sessions.id as id",
      "sessions.expires_at as expires_at",
      "sessions.mfa as mfa",
      "sessions.last_seen_at as last_seen_at",
      "users.id as user_id",
      "users.email as email",
      "users.email_verified as email_verified",
      "users.created_at as created_at",
    ])
    .where("sessions.id", "=", id)
    .executeTakeFirst()
  if (!row) return null
  const expiresMs = Date.parse(row.expires_at)
  if (expiresMs <= Date.now()) {
    await db.deleteFrom("sessions").where("id", "=", id).execute()
    return null
  }
  let expiresAt = row.expires_at
  let renewed = false
  const renew = expiresMs - Date.now() < RENEW_BEFORE_MS
  const seenStale =
    !row.last_seen_at ||
    Date.now() - Date.parse(row.last_seen_at) > SEEN_EVERY_MS
  if (renew || seenStale) {
    if (renew) expiresAt = new Date(Date.now() + SESSION_MS).toISOString()
    await db
      .updateTable("sessions")
      .set({ expires_at: expiresAt, last_seen_at: new Date().toISOString() })
      .where("id", "=", id)
      .execute()
    renewed = renew
  }
  return {
    session: { id, expiresAt, mfa: row.mfa === 1 },
    user: {
      id: row.user_id,
      email: row.email,
      emailVerified: row.email_verified === 1,
      createdAt: row.created_at,
    },
    renewed,
  }
}

export const invalidateSession = (db: Db, sessionId: string) =>
  db.deleteFrom("sessions").where("id", "=", sessionId).execute()

/** Signs the user out everywhere, optionally keeping the session that made the change. */
export const invalidateUserSessions = (
  db: Db,
  userId: string,
  keepSessionId?: string,
) => {
  let q = db.deleteFrom("sessions").where("user_id", "=", userId)
  if (keepSessionId) q = q.where("id", "!=", keepSessionId)
  return q.execute()
}

export const setSessionCookie = (
  cookies: Cookies,
  token: string,
  expiresAt: string,
  secure: boolean,
) =>
  cookies.set(SESSION_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure,
    expires: new Date(expiresAt),
  })

export const clearSessionCookie = (cookies: Cookies) =>
  cookies.delete(SESSION_COOKIE, { path: "/" })
