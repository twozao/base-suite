import { error, fail, redirect } from "@sveltejs/kit"
import { z } from "zod"
import { isValidTimeZone } from "$lib/booking/time"
import { requireModule } from "$lib/server/auth/staff"
import {
  eventTypeBySlug,
  parseAnswers,
  publicEventType,
} from "$lib/server/booking/event_types"
import { notifyBooked } from "$lib/server/booking/notify"
import { createBooking } from "$lib/server/booking/service"
import { captureLead } from "$lib/server/crm"
import { getSettings } from "$lib/server/settings"
import { clientIp } from "$lib/server/security/request"
import { rateLimit, RATE_LIMITS } from "$lib/server/security/rate_limit"
import type { Actions, PageServerLoad, RequestEvent } from "./$types"

const activeType = async ({
  locals,
  params,
}: Pick<RequestEvent, "locals" | "params">) => {
  requireModule("booking")
  const settings = await getSettings(locals.db)
  if (!settings.booking.enabled) error(404, "Not found")
  const type = await eventTypeBySlug(locals.db, params.slug)
  if (!type || !type.active) error(404, "Not found")
  return { type, settings }
}

export const load: PageServerLoad = async (event) => {
  const { type } = await activeType(event)
  const { locals, setHeaders } = event
  let prefill = { name: "", email: "" }
  if (locals.user) {
    const profile = await locals.db
      .selectFrom("profiles")
      .select("full_name")
      .where("id", "=", locals.user.id)
      .executeTakeFirst()
    prefill = { name: profile?.full_name ?? "", email: locals.user.email }
  }
  setHeaders({
    "cache-control": locals.user
      ? "private, max-age=0"
      : "public, max-age=60, s-maxage=60",
  })
  return { type: publicEventType(type), prefill }
}

const invitee = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(200),
  email: z.string().trim().max(320).email("Enter a valid email address"),
  notes: z.string().trim().max(2000),
})

export const actions: Actions = {
  book: async (event) => {
    const { type, settings } = await activeType(event)
    const { request, locals, url } = event
    const db = locals.db
    const f = await request.formData()
    const read = (k: string) => String(f.get(k) ?? "")
    // Honeypot tripped: look successful so bots learn nothing.
    if (read("website_url")) redirect(303, "/book")

    const values = Object.fromEntries(
      [
        "name",
        "email",
        "phone",
        "notes",
        ...type.questions.map((q) => `q_${q.id}`),
      ].map((k) => [k, read(k)]),
    )
    const errors: Record<string, string> = {}
    const parsed = invitee.safeParse(values)
    if (!parsed.success) {
      for (const i of parsed.error.issues)
        errors[String(i.path[0])] ??= i.message
    }
    const phone = read("phone").trim().slice(0, 60)
    if (type.locationKind === "phone" && !phone)
      errors.phone = "We need a number to call you on"
    const answers = parseAnswers(type.questions, (id) => read(`q_${id}`))
    if (!answers.ok) errors[answers.field] = answers.error
    if (Object.keys(errors).length || !parsed.success || !answers.ok)
      return fail(400, { errors, values })

    const start = Date.parse(read("start"))
    if (Number.isNaN(start))
      return fail(409, { taken: true, error: "Please pick a time.", values })
    if (
      !(await rateLimit(
        db,
        `booking:${clientIp(event)}`,
        RATE_LIMITS.bookingCreate,
      ))
    )
      return fail(429, {
        error: "Too many bookings from this address. Please try again later.",
        values,
      })

    const notes = parsed.data.notes
    const timezone = isValidTimeZone(read("timezone"))
      ? read("timezone")
      : settings.availability.timezone
    const result = await createBooking(db, type, settings.availability, {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: phone || null,
      timezone,
      answers: notes
        ? [...answers.answers, { label: "Notes", value: notes }]
        : answers.answers,
      userId: locals.user?.id ?? null,
      start,
    })
    if (!result.ok) {
      return result.reason === "taken"
        ? fail(409, {
            taken: true,
            error: "That time was just taken. Please pick another.",
            values,
          })
        : fail(409, {
            error:
              "This email already has several upcoming meetings. Please reschedule one of those instead.",
            values,
          })
    }

    await captureLead(db, {
      email: parsed.data.email,
      name: parsed.data.name,
      phone,
      userId: locals.user?.id,
      source: "booking",
      kind: "booking",
      body: `Booked ${type.name} for ${result.start}`,
      ref: { type: "booking", id: result.id },
    })
    const row = await db
      .selectFrom("bookings")
      .selectAll()
      .where("id", "=", result.id)
      .executeTakeFirstOrThrow()
    await notifyBooked(db, row, url.origin, result.token)
    redirect(303, `/book/manage/${result.token}?booked=1`)
  },
}
