import { error, fail } from "@sveltejs/kit"
import { audit } from "$lib/server/audit"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { nowIso, parseJson } from "$lib/server/db/json"
import { notifyCanceled } from "$lib/server/booking/notify"
import { cancelBooking } from "$lib/server/booking/service"
import type { Actions, PageServerLoad, RequestEvent } from "./$types"

const findBooking = async (event: RequestEvent) => {
  requireModule("booking")
  await requirePermission(event, "bookings.view")
  const row = await event.locals.db
    .selectFrom("bookings")
    .selectAll()
    .where("id", "=", event.params.id)
    .executeTakeFirst()
  if (!row) error(404, "Not found")
  return row
}

export const load: PageServerLoad = async (event) => {
  const row = await findBooking(event as unknown as RequestEvent)
  const b = { ...row, manage_token_hash: null }
  return {
    booking: b,
    answers: parseJson<{ label: string; value: string }[]>(b.answers, []),
    upcoming:
      b.status === "scheduled" && Date.parse(b.start_time ?? "") > Date.now(),
  }
}

export const actions: Actions = {
  notes: async (event) => {
    const b = await findBooking(event)
    const admin_notes = String(
      (await event.request.formData()).get("admin_notes") ?? "",
    ).slice(0, 10000)
    await event.locals.db
      .updateTable("bookings")
      .set({ admin_notes, updated_at: nowIso() })
      .where("id", "=", b.id)
      .execute()
    await audit(event, "booking.updated", { type: "booking", id: b.id })
    return { message: "Notes saved" }
  },
  cancel: async (event) => {
    const b = await findBooking(event)
    const reason =
      String((await event.request.formData()).get("reason") ?? "")
        .trim()
        .slice(0, 2000) || null
    if (!(await cancelBooking(event.locals.db, b.id, reason)))
      return fail(400, { error: "This booking is not active." })
    await audit(event, "booking.canceled", { type: "booking", id: b.id })
    if (b.provider === "native")
      await notifyCanceled(
        event.locals.db,
        { ...b, sequence: b.sequence + 1 },
        event.url.origin,
        reason,
      )
    return { message: "Booking cancelled" }
  },
  noShow: async (event) => {
    const b = await findBooking(event)
    if (b.status === "canceled" || Date.parse(b.start_time ?? "") > Date.now())
      return fail(400, {
        error: "Only a past meeting can be marked as a no-show.",
      })
    const status = b.status === "no_show" ? "scheduled" : "no_show"
    await event.locals.db
      .updateTable("bookings")
      .set({ status, updated_at: nowIso() })
      .where("id", "=", b.id)
      .execute()
    await audit(event, "booking.updated", { type: "booking", id: b.id })
    return {
      message: status === "no_show" ? "Marked as a no-show" : "No-show removed",
    }
  },
}
