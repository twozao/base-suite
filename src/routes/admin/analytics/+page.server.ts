import { error } from "@sveltejs/kit"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import type { PageServerLoad } from "./$types"

const RANGES = [7, 30, 90] as const

export const load: PageServerLoad = async (event) => {
  requireModule("analytics")
  await requirePermission(event, "analytics.view")
  const raw = Number(event.url.searchParams.get("days"))
  const days = (RANGES as readonly number[]).includes(raw) ? raw : 30
  const start = new Date(Date.now() - (days - 1) * 86400e3)
    .toISOString()
    .slice(0, 10)
  const db = event.locals.supabaseServiceRole
  const [pages, refs] = await Promise.all([
    db
      .from("analytics_daily")
      .select("day, path, views")
      .gte("day", start)
      .limit(50_000),
    db
      .from("analytics_referrers")
      .select("host, views")
      .gte("day", start)
      .limit(20_000),
  ])
  if (pages.error || refs.error) error(500, "Could not load analytics")

  const byDay = new Map<string, number>()
  const byPath = new Map<string, number>()
  for (const r of pages.data ?? []) {
    byDay.set(r.day, (byDay.get(r.day) ?? 0) + r.views)
    byPath.set(r.path, (byPath.get(r.path) ?? 0) + r.views)
  }
  const byHost = new Map<string, number>()
  for (const r of refs.data ?? [])
    byHost.set(r.host, (byHost.get(r.host) ?? 0) + r.views)

  const series = Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 86400e3)
      .toISOString()
      .slice(0, 10)
    return { day: d, views: byDay.get(d) ?? 0 }
  })
  const top = (m: Map<string, number>) =>
    [...m]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([key, views]) => ({ key, views }))
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
    topPages: top(byPath),
    topReferrers: top(byHost),
  }
}
