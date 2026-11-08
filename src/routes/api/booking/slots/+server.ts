import { error, json } from "@sveltejs/kit"
import { requireModule, getStaff } from "$lib/server/auth/staff"
import { eventTypeBySlug } from "$lib/server/booking/event_types"
import {
  availableSlots,
  findManagedBooking,
  paddedRange,
} from "$lib/server/booking/service"
import { getSettings } from "$lib/server/settings"
import { clientIp } from "$lib/server/security/request"
import { rateLimit, RATE_LIMITS } from "$lib/server/security/rate_limit"
import type { RequestHandler } from "./$types"

const DATE = /^\d{4}-\d{2}-\d{2}$/
const MAX_RANGE_DAYS = 62

// Free times for one event type. Never cached: a slot taken a moment ago must disappear.
export const GET: RequestHandler = async (event) => {
  requireModule("booking")
  const { url, locals } = event
  const settings = await getSettings(locals.db)
  if (!settings.booking.enabled) error(404, "Not found")
  const from = url.searchParams.get("from") ?? ""
  const to = url.searchParams.get("to") ?? ""
  if (
    !DATE.test(from) ||
    !DATE.test(to) ||
    !(Date.parse(to) >= Date.parse(from)) ||
    Date.parse(to) - Date.parse(from) > MAX_RANGE_DAYS * 86_400_000
  )
    error(400, "Invalid date range")
  if (
    !(await rateLimit(
      locals.db,
      `slots:${clientIp(event)}`,
      RATE_LIMITS.bookingSlots,
    ))
  )
    error(429, "Too many requests")

  const type = await eventTypeBySlug(
    locals.db,
    url.searchParams.get("event") ?? "",
  )
  if (!type) error(404, "Not found")
  let excludeBookingId: string | undefined
  const moving = url.searchParams.get("reschedule")
  if (moving) {
    const staff = await getStaff(event)
    const booking = await findManagedBooking(locals.db, moving, {
      userId: locals.user?.id,
      isStaff: !!staff?.permissions.has("bookings.view"),
    })
    if (!booking) error(404, "Not found")
    excludeBookingId = booking.id
  } else if (!type.active) {
    error(404, "Not found")
  }
  const slots = await availableSlots(locals.db, type, settings.availability, {
    ...paddedRange(from, to),
    excludeBookingId,
  })
  return json(
    { slots: slots.map((ms) => new Date(ms).toISOString()) },
    { headers: { "cache-control": "no-store" } },
  )
}
