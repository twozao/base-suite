import { error, type RequestEvent } from "@sveltejs/kit"
import { getStaff, requireModule } from "$lib/server/auth/staff"
import { findManagedBooking } from "$lib/server/booking/service"

/** The booking this manage URL opens, or a 404. Works for the emailed link, its owner and staff. */
export const managedBooking = async (
  event: Pick<RequestEvent, "locals"> & { params: { token: string } },
) => {
  requireModule("booking")
  const staff = await getStaff(event)
  const booking = await findManagedBooking(
    event.locals.db,
    event.params.token,
    {
      userId: event.locals.user?.id,
      isStaff: !!staff?.permissions.has("bookings.view"),
    },
  )
  if (!booking) error(404, "Not found")
  return booking
}

export const PRIVATE_PAGE = { "cache-control": "private, no-store" }
