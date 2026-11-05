import { env } from "$env/dynamic/private"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { nowIso } from "$lib/server/db/json"
import { containsText } from "$lib/server/db/query"
import { pageParams, searchParam } from "$lib/server/pagination"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  requireModule("booking")
  await requirePermission(event, "bookings.view")
  const view =
    event.url.searchParams.get("view") === "past" ? "past" : "upcoming"
  const q = searchParam(event.url)
  const { page, size, from } = pageParams(event.url)
  const now = nowIso()
  const db = event.locals.db

  let base =
    view === "upcoming"
      ? db.selectFrom("bookings").where("start_time", ">=", now)
      : db.selectFrom("bookings").where("start_time", "<", now)
  if (q) {
    base = base.where((eb) =>
      eb.or([
        containsText("invitee_email", q),
        containsText("invitee_name", q),
        containsText("event_name", q),
      ]),
    )
  }
  const [{ n }, rows] = await Promise.all([
    base.select(db.fn.countAll<number>().as("n")).executeTakeFirstOrThrow(),
    base
      .select([
        "id",
        "event_name",
        "invitee_name",
        "invitee_email",
        "user_id",
        "start_time",
        "end_time",
        "status",
        "cancel_reason",
      ])
      .orderBy("start_time", view === "upcoming" ? "asc" : "desc")
      .limit(size)
      .offset(from)
      .execute(),
  ])
  return {
    rows,
    total: Number(n),
    page,
    size,
    q,
    view,
    webhookConfigured: !!env.PRIVATE_CALENDLY_WEBHOOK_SIGNING_KEY,
  }
}
