import { error, fail, redirect } from "@sveltejs/kit"
import { audit } from "$lib/server/audit"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { isUniqueViolation } from "$lib/server/db/errors"
import { nowIso } from "$lib/server/db/json"
import {
  eventTypeById,
  eventTypeSchema,
  toRow,
} from "$lib/server/booking/event_types"
import type { Actions, PageServerLoad } from "./$types"

const BLANK = {
  name: "",
  slug: "",
  description: "",
  durationMinutes: 30,
  locationKind: "video" as const,
  locationDetail: "",
  bufferBefore: 0,
  bufferAfter: 0,
  minNoticeMinutes: 240,
  maxDaysAhead: 60,
  slotInterval: 30,
  dailyLimit: null,
  active: true,
  questions: [],
}

export const load: PageServerLoad = async (event) => {
  requireModule("booking")
  await requirePermission(event, "settings.manage")
  if (event.params.id === "new") return { type: BLANK, isNew: true }
  const type = await eventTypeById(event.locals.db, event.params.id)
  if (!type) error(404, "Not found")
  return { type, isNew: false }
}

export const actions: Actions = {
  default: async (event) => {
    requireModule("booking")
    await requirePermission(event, "settings.manage")
    const raw = String((await event.request.formData()).get("payload") ?? "")
    let value: unknown
    try {
      value = JSON.parse(raw)
    } catch {
      return fail(400, { error: "Invalid form data" })
    }
    const parsed = eventTypeSchema.safeParse(value)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return fail(400, { error: issue.message })
    }
    const db = event.locals.db
    const id = event.params.id === "new" ? crypto.randomUUID() : event.params.id
    try {
      if (event.params.id === "new") {
        await db
          .insertInto("booking_event_types")
          .values({ id, ...toRow(parsed.data) })
          .execute()
      } else {
        await db
          .updateTable("booking_event_types")
          .set({ ...toRow(parsed.data), updated_at: nowIso() })
          .where("id", "=", id)
          .execute()
      }
    } catch (e) {
      if (isUniqueViolation(e))
        return fail(400, { error: "Another event type already uses that URL." })
      throw e
    }
    await audit(event, "booking.event_type_saved", {
      type: "booking_event_type",
      id,
    })
    redirect(303, "/admin/bookings/event-types")
  },
}
