import { fail, redirect } from "@sveltejs/kit"
import { googleCalendarUrl } from "$lib/booking/ics"
import { parseJson } from "$lib/server/db/json"
import { notifyCanceled } from "$lib/server/booking/notify"
import { cancelBooking } from "$lib/server/booking/service"
import { captureLead } from "$lib/server/crm"
import { getSettings } from "$lib/server/settings"
import { managedBooking, PRIVATE_PAGE } from "./manage.server"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  event.setHeaders(PRIVATE_PAGE)
  const b = await managedBooking(event)
  const { brand } = await getSettings(event.locals.db)
  const title = `${b.event_name ?? "Meeting"} with ${brand.siteName}`
  const upcoming =
    b.status === "scheduled" && Date.parse(b.start_time ?? "") > Date.now()
  return {
    booking: {
      eventName: b.event_name,
      inviteeName: b.invitee_name,
      inviteeEmail: b.invitee_email,
      timezone: b.invitee_timezone ?? "UTC",
      start: b.start_time ?? "",
      end: b.end_time ?? "",
      location: b.location,
      status: b.status,
      cancelReason: b.cancel_reason,
      answers: parseJson<{ label: string; value: string }[]>(b.answers, []),
    },
    upcoming,
    canReschedule: upcoming && !!b.event_type_id,
    googleUrl: googleCalendarUrl({
      uid: b.id,
      title,
      start: b.start_time ?? "",
      end: b.end_time ?? "",
      location: b.location ?? "",
    }),
  }
}

export const actions: Actions = {
  cancel: async (event) => {
    const b = await managedBooking(event)
    if (b.status !== "scheduled" || Date.parse(b.start_time ?? "") < Date.now())
      return fail(400, { error: "This meeting can no longer be cancelled." })
    const reason =
      String((await event.request.formData()).get("reason") ?? "")
        .trim()
        .slice(0, 2000) || null
    await cancelBooking(event.locals.db, b.id, reason)
    await captureLead(event.locals.db, {
      email: b.invitee_email,
      name: b.invitee_name,
      source: "booking",
      kind: "booking",
      body: `Cancelled ${b.event_name} for ${b.start_time}`,
      ref: { type: "booking", id: b.id },
    })
    await notifyCanceled(
      event.locals.db,
      { ...b, sequence: b.sequence + 1 },
      event.url.origin,
      reason,
    )
    redirect(303, `${event.url.pathname}?canceled=1`)
  },
}
