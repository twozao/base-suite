import { error } from "@sveltejs/kit"
import { requirePermission } from "$lib/server/auth/staff"
import { isAuditAction } from "$lib/server/audit"
import { pageParams } from "$lib/server/pagination"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  await requirePermission(event, "audit.view")
  const { page, size, from, to } = pageParams(event.url, 50)
  const requested = event.url.searchParams.get("action")
  const action = isAuditAction(requested) ? requested : ""
  const db = event.locals.supabaseServiceRole
  let query = db
    .from("audit_log")
    .select(
      "id, actor_id, action, target_type, target_id, meta, ip, created_at",
      { count: "exact" },
    )
    .order("id", { ascending: false })
    .range(from, to)
  if (action) query = query.eq("action", action)
  const { data, count, error: e } = await query
  if (e) error(500, "Could not load audit log")

  // Resolve actor emails for the rows on this page only
  const actorIds = [
    ...new Set((data ?? []).map((r) => r.actor_id).filter(Boolean)),
  ] as string[]
  const emails: Record<string, string> = {}
  await Promise.all(
    actorIds.map(async (id) => {
      const { data: u } = await db.auth.admin.getUserById(id)
      if (u.user?.email) emails[id] = u.user.email
    }),
  )
  return { rows: data ?? [], total: count ?? 0, page, size, action, emails }
}
