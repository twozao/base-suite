import type { Db } from "../db"
import { isUniqueViolation } from "../db/errors"
import { nowIso } from "../db/json"
import { isOAuthProvider, type OAuthProviderId } from "$lib/signin_providers"
import type { OAuthProfile } from "./oauth"
import { invalidateUserSessions } from "./session"
import { createUser, findUserByEmail, normalizeEmail } from "./users"

export const linkedProviders = async (
  db: Db,
  userId: string,
): Promise<OAuthProviderId[]> => {
  const rows = await db
    .selectFrom("oauth_accounts")
    .select("provider")
    .where("user_id", "=", userId)
    .execute()
  return rows.map((r) => r.provider).filter(isOAuthProvider)
}

const insertLink = (db: Db, p: OAuthProfile, userId: string) =>
  db
    .insertInto("oauth_accounts")
    .values({ provider: p.provider, subject: p.subject, user_id: userId })
    .execute()

const ownerOf = async (db: Db, p: OAuthProfile) =>
  (
    await db
      .selectFrom("oauth_accounts")
      .select("user_id")
      .where("provider", "=", p.provider)
      .where("subject", "=", p.subject)
      .executeTakeFirst()
  )?.user_id ?? null

/** Connects a provider to the signed-in user from Account -> Settings. */
export const linkToUser = async (
  db: Db,
  profile: OAuthProfile,
  userId: string,
): Promise<{ ok: true } | { ok: false; reason: "linked_elsewhere" }> => {
  const owner = await ownerOf(db, profile)
  if (owner === userId) return { ok: true }
  if (owner) return { ok: false, reason: "linked_elsewhere" }
  try {
    await db
      .deleteFrom("oauth_accounts")
      .where("user_id", "=", userId)
      .where("provider", "=", profile.provider)
      .execute()
    await insertLink(db, profile, userId)
    return { ok: true }
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, reason: "linked_elsewhere" }
    throw e
  }
}

export type OAuthSignInResult =
  | { ok: true; userId: string }
  | {
      ok: false
      reason: "account_exists" | "signup_closed" | "email_unverified"
    }

/**
 * Maps a provider identity to a user. An account holding a password is not joined by email while
 * password sign-in is on: its address may be unproven, and its password may be someone else's.
 */
export const resolveOAuthUser = async (
  db: Db,
  profile: OAuthProfile,
  policy: { canSignUp: boolean; password: boolean },
): Promise<OAuthSignInResult> => {
  const owner = await ownerOf(db, profile)
  if (owner) return { ok: true, userId: owner }
  if (!profile.emailVerified || !profile.email)
    return { ok: false, reason: "email_unverified" }

  const existing = await findUserByEmail(db, profile.email)
  if (existing) {
    if (existing.password_hash && policy.password)
      return { ok: false, reason: "account_exists" }
    // Password sign-in is off, so the provider's proof is what counts; any old password is dropped.
    if (existing.password_hash) {
      await db
        .updateTable("users")
        .set({ password_hash: null, email_verified: 1, updated_at: nowIso() })
        .where("id", "=", existing.id)
        .execute()
      await invalidateUserSessions(db, existing.id)
    }
    await insertLink(db, profile, existing.id)
    return { ok: true, userId: existing.id }
  }
  if (!policy.canSignUp) return { ok: false, reason: "signup_closed" }
  const created = await createUser(db, {
    email: normalizeEmail(profile.email),
    password: null,
    fullName: profile.name,
    emailVerified: true,
  })
  if (!created.ok) return { ok: false, reason: "account_exists" }
  await insertLink(db, profile, created.user.id)
  return { ok: true, userId: created.user.id }
}

/** Removes a connection unless it is the user's only way back in. */
export const unlinkProvider = async (
  db: Db,
  userId: string,
  provider: OAuthProviderId,
): Promise<{ ok: boolean }> => {
  const [row, linked] = await Promise.all([
    db
      .selectFrom("users")
      .select("password_hash")
      .where("id", "=", userId)
      .executeTakeFirst(),
    linkedProviders(db, userId),
  ])
  const others = linked.filter((p) => p !== provider).length
  if (!row?.password_hash && others === 0) return { ok: false }
  await db
    .deleteFrom("oauth_accounts")
    .where("user_id", "=", userId)
    .where("provider", "=", provider)
    .execute()
  return { ok: true }
}
