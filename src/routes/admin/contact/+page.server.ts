import { error } from "@sveltejs/kit"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { ilikeTerm, pageParams, searchParam } from "$lib/server/pagination"
import type { PageServerLoad } from "./$types"

const STATUSES = ["new", "open", "closed", "spam"] as const

export const load: PageServerLoad = async (event) => {
  requireModule("contact")
  await requirePermission(event, "contact.manage")
  const q = searchParam(event.url)
  const status = event.url.searchParams.get("status") ?? "new"
  const { page, size, from, to } = pageParams(event.url)

  let query = event.locals.supabaseServiceRole
    .from("contact_requests")
    .select(
      "id, first_name, last_name, email, company_name, message_body, status, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to)
  if ((STATUSES as readonly string[]).includes(status))
    query = query.eq("status", status as (typeof STATUSES)[number])
  if (q) {
    const t = ilikeTerm(q)
    query = query.or(
      `email.ilike.${t},first_name.ilike.${t},last_name.ilike.${t},company_name.ilike.${t}`,
    )
  }
  const { data, count, error: e } = await query
  if (e) error(500, "Could not load contact requests")
  return {
    rows: data ?? [],
    total: count ?? 0,
    page,
    size,
    q,
    status,
    statuses: STATUSES,
  }
}
