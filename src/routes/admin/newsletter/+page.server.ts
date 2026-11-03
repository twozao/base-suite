import { error, fail } from "@sveltejs/kit"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { ilikeTerm, pageParams, searchParam } from "$lib/server/pagination"
import { isUuid } from "$lib/server/ids"
import { audit } from "$lib/server/audit"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  requireModule("newsletter")
  await requirePermission(event, "newsletter.manage")
  const db = event.locals.supabaseServiceRole
  const status = event.url.searchParams.get("status") ?? "confirmed"
  const q = searchParam(event.url)
  const { page, size, from, to } = pageParams(event.url)
  let query = db
    .from("newsletter_subscribers")
    .select("id, email, name, status, source, created_at, confirmed_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, to)
  if (
    status === "confirmed" ||
    status === "pending" ||
    status === "unsubscribed"
  )
    query = query.eq("status", status)
  if (q)
    query = query.or(`email.ilike.${ilikeTerm(q)},name.ilike.${ilikeTerm(q)}`)
  const head = { count: "exact" as const, head: true }
  const monthAgo = new Date(Date.now() - 30 * 86400e3).toISOString()
  const [{ data, count, error: e }, confirmed, pending, unsub, recent] =
    await Promise.all([
      query,
      db
        .from("newsletter_subscribers")
        .select("id", head)
        .eq("status", "confirmed"),
      db
        .from("newsletter_subscribers")
        .select("id", head)
        .eq("status", "pending"),
      db
        .from("newsletter_subscribers")
        .select("id", head)
        .eq("status", "unsubscribed"),
      db
        .from("newsletter_subscribers")
        .select("id", head)
        .eq("status", "confirmed")
        .gte("confirmed_at", monthAgo),
    ])
  if (e) error(500, "Could not load subscribers")
  return {
    rows: data ?? [],
    total: count ?? 0,
    page,
    size,
    status,
    q,
    stats: {
      confirmed: confirmed.count ?? 0,
      pending: pending.count ?? 0,
      unsubscribed: unsub.count ?? 0,
      last30: recent.count ?? 0,
    },
  }
}

export const actions: Actions = {
  delete: async (event) => {
    requireModule("newsletter")
    await requirePermission(event, "newsletter.manage")
    const id = String((await event.request.formData()).get("id") ?? "")
    if (!isUuid(id)) return fail(400, { error: "Invalid subscriber" })
    await event.locals.supabaseServiceRole
      .from("newsletter_subscribers")
      .delete()
      .eq("id", id)
    await audit(event, "newsletter.subscriber_deleted", {
      type: "subscriber",
      id,
    })
    return { message: "Subscriber deleted" }
  },
}
