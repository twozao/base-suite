import { error } from "@sveltejs/kit"
import { env } from "$env/dynamic/private"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { ilikeTerm, pageParams, searchParam } from "$lib/server/pagination"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  requireModule("booking")
  await requirePermission(event, "bookings.view")
  const view =
    event.url.searchParams.get("view") === "past" ? "past" : "upcoming"
  const q = searchParam(event.url)
  const { page, size, from, to } = pageParams(event.url)
  const now = new Date().toISOString()

  let query = event.locals.supabaseServiceRole
    .from("bookings")
    .select(
      "id, event_name, invitee_name, invitee_email, user_id, start_time, end_time, status, cancel_reason",
      { count: "exact" },
    )
    .range(from, to)
  query =
    view === "upcoming"
      ? query.gte("start_time", now).order("start_time", { ascending: true })
      : query.lt("start_time", now).order("start_time", { ascending: false })
  if (q) {
    const t = ilikeTerm(q)
    query = query.or(
      `invitee_email.ilike.${t},invitee_name.ilike.${t},event_name.ilike.${t}`,
    )
  }
  const { data, count, error: e } = await query
  if (e) error(500, "Could not load bookings")
  return {
    rows: data ?? [],
    total: count ?? 0,
    page,
    size,
    q,
    view,
    webhookConfigured: !!env.PRIVATE_CALENDLY_WEBHOOK_SIGNING_KEY,
  }
}
