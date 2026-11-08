import { error, fail, redirect } from "@sveltejs/kit"
import { isValidTimeZone } from "$lib/booking/time"
import { eventTypeById, publicEventType } from "$lib/server/booking/event_types"
import { notifyRescheduled } from "$lib/server/booking/notify"
import { rescheduleBooking } from "$lib/server/booking/service"
import { getSettings } from "$lib/server/settings"
import { managedBooking, PRIVATE_PAGE } from "../manage.server"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  event.setHeaders(PRIVATE_PAGE)
  const b = await managedBooking(event)
  const manage = `/book/manage/${event.params.token}`
  if (b.status !== "scheduled" || Date.parse(b.start_time ?? "") < Date.now())
    redirect(303, manage)
  const type = b.event_type_id
    ? await eventTypeById(event.locals.db, b.event_type_id)
    : null
  if (!type)
    error(
      404,
      "This meeting type no longer exists. Please cancel and book again.",
    )
  return {
    type: publicEventType(type),
    currentTime: b.start_time,
    param: event.params.token,
    manage,
  }
}

export const actions: Actions = {
  default: async (event) => {
    const b = await managedBooking(event)
    const db = event.locals.db
    const type = b.event_type_id
      ? await eventTypeById(db, b.event_type_id)
      : null
    if (!type) error(404, "Not found")
    const f = await event.request.formData()
    const start = Date.parse(String(f.get("start") ?? ""))
    if (Number.isNaN(start))
      return fail(400, { taken: true, error: "Please pick a time." })
    const { availability } = await getSettings(db)
    const result = await rescheduleBooking(db, b.id, type, availability, {
      start,
    })
    if (!result.ok) {
      return fail(409, {
        taken: true,
        error:
          result.reason === "taken"
            ? "That time was just taken. Please pick another."
            : "This meeting can no longer be moved.",
      })
    }
    const tz = String(f.get("timezone") ?? "")
    if (isValidTimeZone(tz) && tz !== b.invitee_timezone) {
      await db
        .updateTable("bookings")
        .set({ invitee_timezone: tz })
        .where("id", "=", b.id)
        .execute()
    }
    await notifyRescheduled(
      db,
      {
        ...b,
        start_time: result.start,
        end_time: result.end,
        sequence: result.sequence,
        invitee_timezone: isValidTimeZone(tz) ? tz : b.invitee_timezone,
      },
      event.url.origin,
    )
    redirect(303, `/book/manage/${event.params.token}?moved=1`)
  },
}
