import { sql } from "kysely"
import type { Db } from "$lib/server/db"

/** Calendar day in UTC as YYYY-MM-DD, the key both analytics tables use. */
export const todayUtc = () => new Date().toISOString().slice(0, 10)

/**
 * Counts one page view against (day, path) and, when there is an external referrer, (day, host).
 * A plain insert-or-increment upsert so it runs the same on SQLite and Postgres.
 */
export const recordPageView = async (
  db: Db,
  path: string,
  host: string | null,
  day = todayUtc(),
) => {
  await db
    .insertInto("analytics_daily")
    .values({ day, path, views: 1 })
    .onConflict((oc) =>
      oc
        .columns(["day", "path"])
        .doUpdateSet({ views: sql<number>`analytics_daily.views + 1` }),
    )
    .execute()
  if (!host) return
  await db
    .insertInto("analytics_referrers")
    .values({ day, host, views: 1 })
    .onConflict((oc) =>
      oc
        .columns(["day", "host"])
        .doUpdateSet({ views: sql<number>`analytics_referrers.views + 1` }),
    )
    .execute()
}
