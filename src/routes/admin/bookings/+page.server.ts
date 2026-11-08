import { env } from "$env/dynamic/private"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { nowIso } from "$lib/server/db/json"
import { containsText } from "$lib/server/db/query"
import { pageParams, searchParam } from "$lib/server/pagination"
import { getSettings } from "$lib/server/settings"
import type { PageServerLoad } from "./$types"

const VIEWS = ["upcoming", "past", "canceled"] as const

export const load: PageServerLoad = async (event) => {
  requireModule("booking")
  const staff = await requirePermission(event, "bookings.view")
  const asked = event.url.searchParams.get("view")
  const view = VIEWS.find((v) => v === asked) ?? "upcoming"
  const q = searchParam(event.url)
  const { page, size, from } = pageParams(event.url)
  const now = nowIso()
  const db = event.locals.db

  let base = db.selectFrom("bookings")
  if (view === "upcoming")
    base = base.where("start_time", ">=", now).where("status", "=", "scheduled")
  else if (view === "past")
    base = base.where("start_time", "<", now).where("status", "!=", "canceled")
  else base = base.where("status", "=", "canceled")
  if (q) {
    base = base.where((eb) =>
      eb.or([
        containsText("invitee_email", q),
        containsText("invitee_name", q),
        containsText("event_name", q),
      ]),
    )
  }
  const [{ n }, rows, settings] = await Promise.all([
    base.select(db.fn.countAll<number>().as("n")).executeTakeFirstOrThrow(),
    base
      .select([
        "id",
        "provider",
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
    getSettings(db),
  ])
  return {
    rows,
    total: Number(n),
    page,
    size,
    q,
    view,
    canConfigure: staff.permissions.has("settings.manage"),
    calendlyNeedsWebhook:
      settings.booking.eventTypes.length > 0 &&
      !env.PRIVATE_CALENDLY_WEBHOOK_SIGNING_KEY,
  }
}
