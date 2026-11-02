import { error } from "@sveltejs/kit"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { ilikeTerm, pageParams, searchParam } from "$lib/server/pagination"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  requireModule("chat")
  const staff = await requirePermission(event, "chat.respond")
  event.depends("admin:support")
  const filter = event.url.searchParams.get("filter") ?? "open"
  const q = searchParam(event.url)
  const { page, size, from, to } = pageParams(event.url)

  let query = event.locals.supabaseServiceRole
    .from("chat_conversations")
    .select(
      "id, user_id, visitor_name, visitor_email, page_url, status, assigned_to, unread_by_staff, last_message_at",
      { count: "exact" },
    )
    .order("last_message_at", { ascending: false })
    .range(from, to)
  if (filter === "open") query = query.neq("status", "closed")
  else if (filter === "mine")
    query = query.eq("assigned_to", staff.userId).neq("status", "closed")
  else if (filter === "unassigned")
    query = query.is("assigned_to", null).neq("status", "closed")
  else if (filter === "closed") query = query.eq("status", "closed")
  if (q) {
    const t = ilikeTerm(q)
    query = query.or(`visitor_email.ilike.${t},visitor_name.ilike.${t}`)
  }
  const { data, count, error: e } = await query
  if (e) error(500, "Could not load conversations")
  return {
    rows: data ?? [],
    total: count ?? 0,
    page,
    size,
    filter,
    q,
    me: staff.userId,
  }
}
