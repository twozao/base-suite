import { sql } from "kysely"
import type { Db } from "../db"

export type RateLimitRule = { windowSeconds: number; max: number }

export const RATE_LIMITS = {
  contactForm: { windowSeconds: 600, max: 5 },
  chatStart: { windowSeconds: 3600, max: 10 },
  chatMessage: { windowSeconds: 60, max: 20 },
  chatPoll: { windowSeconds: 60, max: 120 },
  signIn: { windowSeconds: 900, max: 10 },
  signUp: { windowSeconds: 3600, max: 5 },
  passwordReset: { windowSeconds: 3600, max: 5 },
} satisfies Record<string, RateLimitRule>

/**
 * Database-backed fixed-window rate limit, so limits hold across instances. One upsert decides
 * atomically whether the window restarts. Fails open (allows the request) on a database error,
 * trading strictness for availability; the error is logged.
 */
export const rateLimit = async (
  db: Db,
  key: string,
  rule: RateLimitRule,
  now = Date.now(),
): Promise<boolean> => {
  const k = key.slice(0, 200)
  const nowIso = new Date(now).toISOString()
  const cutoff = new Date(now - rule.windowSeconds * 1000).toISOString()
  try {
    const { rows } = await sql<{ hits: number }>`
      insert into rate_limits (key, window_start, hits) values (${k}, ${nowIso}, 1)
      on conflict (key) do update set
        hits = case when rate_limits.window_start < ${cutoff} then 1 else rate_limits.hits + 1 end,
        window_start = case when rate_limits.window_start < ${cutoff} then ${nowIso} else rate_limits.window_start end
      returning hits`.execute(db)
    if (Math.random() < 0.01) await pruneRateLimits(db, now)
    return Number(rows[0]?.hits ?? 1) <= rule.max
  } catch (e) {
    console.error("rate limit failed", e instanceof Error ? e.message : e)
    return true
  }
}

/** Drops windows older than a day. */
export const pruneRateLimits = (db: Db, now = Date.now()) =>
  db
    .deleteFrom("rate_limits")
    .where("window_start", "<", new Date(now - 86_400_000).toISOString())
    .execute()
