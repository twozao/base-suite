import { redirect } from "@sveltejs/kit"
import { requireModule } from "$lib/server/auth/staff"
import { userBookings } from "$lib/server/portal"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ locals }) => {
  requireModule("booking")
  if (!locals.user) redirect(303, "/login")
  const rows = await userBookings(locals.db, locals.user.id)
  const now = Date.now()
  const isUpcoming = (b: (typeof rows)[number]) =>
    b.status === "scheduled" &&
    !!b.start_time &&
    new Date(b.start_time).getTime() >= now
  return {
    upcoming: rows.filter(isUpcoming).reverse(),
    past: rows.filter((b) => !isUpcoming(b)),
  }
}
