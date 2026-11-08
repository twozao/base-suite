import { error } from "@sveltejs/kit"
import { buildIcs } from "$lib/booking/ics"
import { getSettings } from "$lib/server/settings"
import { managedBooking } from "../manage.server"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async (event) => {
  const b = await managedBooking(event)
  if (!b.start_time || !b.end_time) error(404, "Not found")
  const { brand } = await getSettings(event.locals.db)
  return new Response(
    buildIcs({
      uid: `${b.id}@base-suite`,
      title: `${b.event_name ?? "Meeting"} with ${brand.siteName}`,
      start: b.start_time,
      end: b.end_time,
      location: b.location ?? "",
      sequence: b.sequence,
      canceled: b.status === "canceled",
    }),
    {
      headers: {
        "content-type": "text/calendar; charset=utf-8",
        "content-disposition": 'attachment; filename="invite.ics"',
        "cache-control": "private, no-store",
      },
    },
  )
}
