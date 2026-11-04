import { requireModule, requirePermission } from "$lib/server/auth/staff"
import type { PageServerLoad } from "./$types"

const RANGES = [7, 30, 90] as const
const TOP = 15

export const load: PageServerLoad = async (event) => {
  requireModule("analytics")
  await requirePermission(event, "analytics.view")
  const raw = Number(event.url.searchParams.get("days"))
  const days = (RANGES as readonly number[]).includes(raw) ? raw : 30
  const start = new Date(Date.now() - (days - 1) * 86400e3)
    .toISOString()
    .slice(0, 10)
  const db = event.locals.db
  const [perDay, topPaths, topHosts] = await Promise.all([
    db
      .selectFrom("analytics_daily")
      .select(["day", db.fn.sum<number>("views").as("total")])
      .where("day", ">=", start)
      .groupBy("day")
      .execute(),
    db
      .selectFrom("analytics_daily")
      .select(["path as key", db.fn.sum<number>("views").as("total")])
      .where("day", ">=", start)
      .groupBy("path")
      .orderBy("total", "desc")
      .limit(TOP)
      .execute(),
    db
      .selectFrom("analytics_referrers")
      .select(["host as key", db.fn.sum<number>("views").as("total")])
      .where("day", ">=", start)
      .groupBy("host")
      .orderBy("total", "desc")
      .limit(TOP)
      .execute(),
  ])

  const byDay = new Map(perDay.map((r) => [r.day, Number(r.total)]))
  const series = Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 86400e3)
      .toISOString()
      .slice(0, 10)
    return { day: d, views: byDay.get(d) ?? 0 }
  })
  const top = (rows: { key: string; total: number }[]) =>
    rows.map((r) => ({ key: r.key, views: Number(r.total) }))
  const total = series.reduce((s, d) => s + d.views, 0)
  const half = Math.floor(days / 2)
  const recent = series.slice(half).reduce((s, d) => s + d.views, 0)
  const earlier = series.slice(0, half).reduce((s, d) => s + d.views, 0)
  return {
    days,
    ranges: RANGES,
    series,
    total,
    trend: earlier ? Math.round(((recent - earlier) / earlier) * 100) : null,
    topPages: top(topPaths),
    topReferrers: top(topHosts),
  }
}
