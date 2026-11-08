import type { Db } from "./db"
import { nowIso } from "./db/json"

// Public pages are cached at the edge under a version number. Any admin change bumps the version,
// so the next visit renders fresh pages; there is no list of addresses to purge.

const KEY = "cache_version"
let memo: { value: string; at: number } | null = null
const MEMO_MS = 5_000

export const cacheVersion = async (db: Db): Promise<string> => {
  if (memo && Date.now() - memo.at < MEMO_MS) return memo.value
  const row = await db
    .selectFrom("site_settings")
    .select("value")
    .where("key", "=", KEY)
    .executeTakeFirst()
  memo = { value: (row?.value ?? "0").replace(/"/g, ""), at: Date.now() }
  return memo.value
}

export const bumpCacheVersion = async (db: Db) => {
  const value = JSON.stringify(Date.now().toString(36))
  const row = { value, updated_by: null, updated_at: nowIso() }
  await db
    .insertInto("site_settings")
    .values({ key: KEY, ...row })
    .onConflict((oc) => oc.column("key").doUpdateSet(row))
    .execute()
  memo = { value: value.replace(/"/g, ""), at: Date.now() }
}
