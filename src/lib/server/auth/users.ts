import type { Db } from "../db"
import { isUniqueViolation } from "../db/errors"
import { nowIso } from "../db/json"
import type { TokenPurpose } from "../db/schema"
import { randomToken, sha256Hex } from "../security/crypto"
import { hashPassword, verifyPassword } from "./password"
import type { SessionUser } from "./session"

export const normalizeEmail = (email: string) => email.trim().toLowerCase()

const toSessionUser = (row: {
  id: string
  email: string
  email_verified: number
  created_at: string
}): SessionUser => ({
  id: row.id,
  email: row.email,
  emailVerified: row.email_verified === 1,
  createdAt: row.created_at,
})

export const findUserByEmail = async (db: Db, email: string) => {
  const row = await db
    .selectFrom("users")
    .select(["id", "email", "email_verified", "created_at", "password_hash"])
    .where("email", "=", normalizeEmail(email))
    .executeTakeFirst()
  return row ?? null
}

export type CreateUserResult =
  | { ok: true; user: SessionUser; firstUser: boolean }
  | { ok: false; reason: "email_taken" }

/**
 * Creates the account and its profile in one transaction. The very first account becomes the
 * admin, so a fresh install needs no console step to get an owner.
 */
export const createUser = async (
  db: Db,
  input: { email: string; password: string; fullName?: string | null },
): Promise<CreateUserResult> => {
  const id = crypto.randomUUID()
  const email = normalizeEmail(input.email)
  const password_hash = await hashPassword(input.password)
  try {
    return await db.transaction().execute(async (trx) => {
      const inserted = await trx
        .insertInto("users")
        .values({ id, email, password_hash })
        .returning(["id", "email", "email_verified", "created_at"])
        .executeTakeFirstOrThrow()
      await trx
        .insertInto("profiles")
        .values({ id, full_name: input.fullName ?? null })
        .execute()
      const anyRole = await trx
        .selectFrom("user_roles")
        .select("user_id")
        .limit(1)
        .executeTakeFirst()
      const firstUser = !anyRole
      if (firstUser) {
        await trx
          .insertInto("user_roles")
          .values({ user_id: id, role: "admin" })
          .execute()
      }
      return { ok: true, user: toSessionUser(inserted), firstUser }
    })
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, reason: "email_taken" }
    throw e
  }
}

/** Checks the password and records the sign-in. Unknown email and wrong password answer the same. */
export const signInWithPassword = async (
  db: Db,
  email: string,
  password: string,
): Promise<SessionUser | null> => {
  const row = await findUserByEmail(db, email)
  if (!row || !(await verifyPassword(password, row.password_hash))) return null
  await db
    .updateTable("users")
    .set({ last_sign_in_at: nowIso() })
    .where("id", "=", row.id)
    .execute()
  return toSessionUser(row)
}

export const checkPassword = async (
  db: Db,
  userId: string,
  password: string,
) => {
  const row = await db
    .selectFrom("users")
    .select("password_hash")
    .where("id", "=", userId)
    .executeTakeFirst()
  return !!row && (await verifyPassword(password, row.password_hash))
}

export const updatePassword = async (
  db: Db,
  userId: string,
  password: string,
) => {
  await db
    .updateTable("users")
    .set({ password_hash: await hashPassword(password), updated_at: nowIso() })
    .where("id", "=", userId)
    .execute()
}

export const updateEmail = async (
  db: Db,
  userId: string,
  email: string,
): Promise<{ ok: true } | { ok: false; reason: "email_taken" }> => {
  try {
    await db
      .updateTable("users")
      .set({
        email: normalizeEmail(email),
        email_verified: 0,
        updated_at: nowIso(),
      })
      .where("id", "=", userId)
      .execute()
    return { ok: true }
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, reason: "email_taken" }
    throw e
  }
}

export const markEmailVerified = (db: Db, userId: string) =>
  db
    .updateTable("users")
    .set({ email_verified: 1, updated_at: nowIso() })
    .where("id", "=", userId)
    .execute()

/** Removes the account; sessions, profile, roles and the Stripe customer link go with it (foreign keys cascade). */
export const deleteUser = (db: Db, userId: string) =>
  db.deleteFrom("users").where("id", "=", userId).execute()

const TOKEN_TTL_MS: Record<TokenPurpose, number> = {
  verify_email: 24 * 60 * 60 * 1000,
  reset_password: 60 * 60 * 1000,
}

/** One live token per user and purpose; the plain token goes in the email, only its hash is stored. */
export const issueToken = async (
  db: Db,
  userId: string,
  purpose: TokenPurpose,
) => {
  const token = randomToken()
  await db.transaction().execute(async (trx) => {
    await trx
      .deleteFrom("auth_tokens")
      .where("user_id", "=", userId)
      .where("purpose", "=", purpose)
      .execute()
    await trx
      .insertInto("auth_tokens")
      .values({
        token_hash: await sha256Hex(token),
        user_id: userId,
        purpose,
        expires_at: new Date(Date.now() + TOKEN_TTL_MS[purpose]).toISOString(),
      })
      .execute()
  })
  return token
}

/** Redeems a token once. Returns the user id, or null when unknown, expired or for another purpose. */
export const consumeToken = async (
  db: Db,
  token: string,
  purpose: TokenPurpose,
) => {
  if (!token || token.length > 100) return null
  const token_hash = await sha256Hex(token)
  const row = await db
    .deleteFrom("auth_tokens")
    .where("token_hash", "=", token_hash)
    .where("purpose", "=", purpose)
    .returning(["user_id", "expires_at"])
    .executeTakeFirst()
  if (!row || Date.parse(row.expires_at) <= Date.now()) return null
  return row.user_id
}
