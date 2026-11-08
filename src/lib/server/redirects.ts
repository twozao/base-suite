import { z } from "zod"
import type { Db } from "./db"
import { nowIso } from "./db/json"

// Redirects from old addresses (a moved page, a WordPress import) and a log of addresses that 404.
// The list is kept in memory per instance and reloaded every few seconds, so a visit costs no query.

type Rule = {
  id: number
  from: string
  to: string
  code: number
  prefix: boolean
}
let memo: { rules: Map<string, Rule>; prefixes: Rule[]; at: number } | null =
  null
const MEMO_MS = 15_000

export const fromPathSchema = z
  .string()
  .trim()
  .max(500)
  .regex(/^\/(?![/\\])[^\s\\]*$/, "Start with / and use no spaces")
  .refine(
    (v) => !/^\/(admin|api|login|auth|account|_app)(\/|$)/.test(v),
    "This address can't be redirected",
  )
export const toUrlSchema = z
  .string()
  .trim()
  .max(1000)
  .regex(
    /^(\/(?![/\\])[^\s\\]*|https?:\/\/[^\s]+)$/,
    "Use a path like /new-page or a full https:// address",
  )

/** Normalises a request path for matching: no trailing slash, decoded spaces kept as is. */
export const normalPath = (p: string) =>
  p.length > 1 ? p.replace(/\/+$/, "") : p

const load = async (db: Db) => {
  if (memo && Date.now() - memo.at < MEMO_MS) return memo
  const rows = await db
    .selectFrom("redirects")
    .select(["id", "from_path", "to_url", "status_code"])
    .limit(5000)
    .execute()
  const rules = new Map<string, Rule>()
  const prefixes: Rule[] = []
  for (const r of rows) {
    const prefix = r.from_path.endsWith("/*")
    const rule = {
      id: Number(r.id),
      from: prefix ? r.from_path.slice(0, -2) : normalPath(r.from_path),
      to: r.to_url,
      code: r.status_code,
      prefix,
    }
    if (prefix) prefixes.push(rule)
    else rules.set(rule.from, rule)
  }
  prefixes.sort((a, b) => b.from.length - a.from.length)
  memo = { rules, prefixes, at: Date.now() }
  return memo
}

export const invalidateRedirects = () => {
  memo = null
}

/** Where a path should go, or null. "/old/*" rules carry the rest of the path to a target ending in "/*". */
export const findRedirect = async (db: Db, path: string, search = "") => {
  const m = await load(db)
  if (!m.rules.size && !m.prefixes.length) return null
  const p = normalPath(path)
  const exact = (search && m.rules.get(p + search)) || m.rules.get(p)
  if (exact) return exact
  for (const r of m.prefixes) {
    if (p === r.from || p.startsWith(`${r.from}/`)) {
      const rest = p.slice(r.from.length)
      const to = r.to.endsWith("/*") ? r.to.slice(0, -2) + rest : r.to
      // "/old/*" to "/*" must not turn /old//evil.com into a link to another site.
      if (/^\/[/\\]/.test(to)) return null
      return { ...r, to }
    }
  }
  return null
}

export const countHit = (db: Db, id: number) =>
  db
    .updateTable("redirects")
    .set((eb) => ({ hits: eb("hits", "+", 1) }))
    .where("id", "=", id)
    .execute()

/** Records a 404 for the admin's list. Bots probing for WordPress files are left out. */
export const logNotFound = async (
  db: Db,
  path: string,
  referrer: string | null,
) => {
  if (
    path.length > 500 ||
    /\.(php|env|ini|sql|bak|asp|aspx|cgi)$|^\/(wp-|xmlrpc|\.git|\.well-known)/i.test(
      path,
    )
  )
    return
  const row = { last_seen: nowIso(), referrer: referrer?.slice(0, 500) ?? null }
  // Keep the list to the 1000 most recent addresses, so random probing cannot grow it forever.
  if (Math.random() < 0.02)
    await db
      .deleteFrom("not_found_log")
      .where("path", "not in", (eb) =>
        eb
          .selectFrom("not_found_log")
          .select("path")
          .orderBy("last_seen", "desc")
          .limit(1000),
      )
      .execute()
  await db
    .insertInto("not_found_log")
    .values({ path, ...row })
    .onConflict((oc) =>
      oc.column("path").doUpdateSet((eb) => ({
        ...row,
        hits: eb("not_found_log.hits", "+", 1),
      })),
    )
    .execute()
}
