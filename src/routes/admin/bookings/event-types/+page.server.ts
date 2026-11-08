import { fail } from "@sveltejs/kit"
import { audit } from "$lib/server/audit"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { nowIso } from "$lib/server/db/json"
import {
  LOCATION_LABELS,
  listEventTypes,
} from "$lib/server/booking/event_types"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  requireModule("booking")
  await requirePermission(event, "settings.manage")
  const types = await listEventTypes(event.locals.db)
  return {
    types: types.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      durationMinutes: t.durationMinutes,
      location: LOCATION_LABELS[t.locationKind],
      active: t.active,
    })),
  }
}

export const actions: Actions = {
  toggle: async (event) => {
    requireModule("booking")
    await requirePermission(event, "settings.manage")
    const id = String((await event.request.formData()).get("id") ?? "")
    const row = await event.locals.db
      .selectFrom("booking_event_types")
      .select("active")
      .where("id", "=", id)
      .executeTakeFirst()
    if (!row) return fail(404, { error: "Not found" })
    await event.locals.db
      .updateTable("booking_event_types")
      .set({ active: row.active ? 0 : 1, updated_at: nowIso() })
      .where("id", "=", id)
      .execute()
    await audit(event, "booking.event_type_saved", {
      type: "booking_event_type",
      id,
    })
    return { message: row.active ? "Turned off" : "Turned on" }
  },
  delete: async (event) => {
    requireModule("booking")
    await requirePermission(event, "settings.manage")
    const id = String((await event.request.formData()).get("id") ?? "")
    await event.locals.db
      .deleteFrom("booking_event_types")
      .where("id", "=", id)
      .execute()
    await audit(event, "booking.event_type_deleted", {
      type: "booking_event_type",
      id,
    })
    return { message: "Deleted. Existing bookings are kept." }
  },
}
