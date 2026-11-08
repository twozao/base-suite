import { sql } from "kysely"
import type { Db } from "../db"
import { containsText } from "../db/query"
import type { AppRole } from "../db/schema"
import { normalizeEmail } from "./users"

export type DirectoryUser = {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  full_name: string | null
  company_name: string | null
  roles: AppRole[]
  subscription_status: string | null
}

const ACTIVE = ["active", "trialing", "past_due"]

/** Admin -> Users listing: search by email, name or company, newest first, with roles and billing state. */
export const listUsers = async (
  db: Db,
  opts: { search?: string; limit?: number; offset?: number } = {},
): Promise<{ users: DirectoryUser[]; total: number }> => {
  const limit = Math.min(Math.max(opts.limit ?? 25, 1), 100)
  const offset = Math.max(opts.offset ?? 0, 0)
  const search = (opts.search ?? "").trim()
  let base = db
    .selectFrom("users")
    .leftJoin("profiles", "profiles.id", "users.id")
  if (search) {
    base = base.where((eb) =>
      eb.or([
        containsText("users.email", search),
        containsText("profiles.full_name", search),
        containsText("profiles.company_name", search),
      ]),
    )
  }
  const [{ total }, rows] = await Promise.all([
    base.select(db.fn.countAll<number>().as("total")).executeTakeFirstOrThrow(),
    base
      .select([
        "users.id",
        "users.email",
        "users.created_at",
        "users.last_sign_in_at",
        "profiles.full_name",
        "profiles.company_name",
      ])
      .orderBy("users.created_at", "desc")
      .limit(limit)
      .offset(offset)
      .execute(),
  ])
  const ids = rows.map((r) => r.id)
  const [roles, subs] = ids.length
    ? await Promise.all([
        db
          .selectFrom("user_roles")
          .select(["user_id", "role"])
          .where("user_id", "in", ids)
          .orderBy("role")
          .execute(),
        db
          .selectFrom("subscriptions")
          .select(["user_id", "status"])
          .where("user_id", "in", ids)
          .orderBy(
            sql`case when status in (${sql.join(ACTIVE)}) then 0 else 1 end`,
          )
          .orderBy("updated_at", "desc")
          .execute(),
      ])
    : [[], []]
  const users = rows.map((r) => ({
    ...r,
    roles: roles.filter((x) => x.user_id === r.id).map((x) => x.role),
    subscription_status: subs.find((s) => s.user_id === r.id)?.status ?? null,
  }))
  return { users, total: Number(total) }
}

export const countUsers = async (db: Db) => {
  const { n } = await db
    .selectFrom("users")
    .select(db.fn.countAll<number>().as("n"))
    .executeTakeFirstOrThrow()
  return Number(n)
}

/** Only a verified address counts, so typing someone's email elsewhere cannot attach things to their account. */
export const findUserIdByEmail = async (db: Db, email: string) => {
  const row = await db
    .selectFrom("users")
    .select("id")
    .where("email", "=", normalizeEmail(email))
    .where("email_verified", "=", 1)
    .executeTakeFirst()
  return row?.id ?? null
}
