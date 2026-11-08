import { z } from "zod"
import type { Db } from "../db"
import { nowIso, parseStringList } from "../db/json"
import { randomToken, sha256Hex } from "../security/crypto"

// API tokens for the Content API. The token is shown once; only its hash is stored. Each token carries
// the scopes the owner ticked, and an app's token is revoked with the app.

export const SCOPES = {
  "content:read": "Read pages, posts and entries, including drafts",
  "content:write": "Create, change and delete pages, posts and entries",
  "media:read": "List images in Media",
  "media:write": "Add images to Media from an address",
  "contacts:read": "Read contact form messages",
  "forms:read": "Read form submissions",
} as const
export type Scope = keyof typeof SCOPES
export const scopeSchema = z.enum(Object.keys(SCOPES) as [Scope, ...Scope[]])

const PREFIX = "bs_"

export const createToken = async (
  db: Db,
  input: {
    name: string
    scopes: Scope[]
    createdBy: string | null
    appId?: string | null
  },
) => {
  const token = `${PREFIX}${randomToken(32)}`
  const id = crypto.randomUUID()
  await db
    .insertInto("api_tokens")
    .values({
      id,
      name: input.name,
      token_hash: await sha256Hex(token),
      scopes: JSON.stringify(input.scopes),
      created_by: input.createdBy,
      app_id: input.appId ?? null,
    })
    .execute()
  return { id, token }
}

export type TokenAuth = { id: string; scopes: Set<Scope>; appId: string | null }

/** The token in an Authorization: Bearer header, if valid and not revoked. */
export const authenticateToken = async (
  db: Db,
  header: string | null,
): Promise<TokenAuth | null> => {
  const m = /^Bearer\s+(bs_[A-Za-z0-9_-]{20,100})$/.exec(header ?? "")
  if (!m) return null
  const row = await db
    .selectFrom("api_tokens")
    .select(["id", "scopes", "app_id", "last_used_at"])
    .where("token_hash", "=", await sha256Hex(m[1]))
    .where("revoked_at", "is", null)
    .executeTakeFirst()
  if (!row) return null
  // The app behind an app token must still be switched on.
  if (row.app_id) {
    const app = await db
      .selectFrom("apps")
      .select("enabled")
      .where("id", "=", row.app_id)
      .executeTakeFirst()
    if (!app?.enabled) return null
  }
  if (!row.last_used_at || Date.now() - Date.parse(row.last_used_at) > 60_000)
    await db
      .updateTable("api_tokens")
      .set({ last_used_at: nowIso() })
      .where("id", "=", row.id)
      .execute()
  return {
    id: row.id,
    scopes: new Set(parseStringList(row.scopes) as Scope[]),
    appId: row.app_id,
  }
}

export const revokeToken = (db: Db, id: string) =>
  db
    .updateTable("api_tokens")
    .set({ revoked_at: nowIso() })
    .where("id", "=", id)
    .execute()
