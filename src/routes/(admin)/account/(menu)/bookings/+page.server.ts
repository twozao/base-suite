import { redirect } from "@sveltejs/kit"
import { requireModule } from "$lib/server/auth/staff"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ locals }) => {
  requireModule("booking")
  if (!locals.user) redirect(303, "/login")
  // Read through the user's own client: RLS returns only their bookings.
  const { data } = await locals.supabase
    .from("bookings")
    .select(
      "id, event_name, start_time, end_time, status, cancel_reason, reschedule_url, cancel_url",
    )
    .order("start_time", { ascending: false })
    .limit(100)
  const now = Date.now()
  const rows = data ?? []
  return {
    upcoming: rows
      .filter(
        (b) =>
          b.status === "scheduled" &&
          b.start_time &&
          new Date(b.start_time).getTime() >= now,
      )
      .reverse(),
    past: rows.filter(
      (b) =>
        !(
          b.status === "scheduled" &&
          b.start_time &&
          new Date(b.start_time).getTime() >= now
        ),
    ),
  }
}
