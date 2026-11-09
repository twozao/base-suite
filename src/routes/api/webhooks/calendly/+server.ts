import { error, json } from "@sveltejs/kit"
import { env } from "$env/dynamic/private"
import {
  bookingFromWebhook,
  calendlyWebhookSchema,
  upsertBooking,
  verifyCalendlySignature,
} from "$lib/server/booking/calendly"
import { requireModule } from "$lib/server/auth/staff"
import { findUserIdByEmail } from "$lib/server/auth/directory"
import { sendAdminEmail } from "$lib/mailer"
import { captureLead } from "$lib/server/crm"
import type { RequestHandler } from "./$types"

// Receives invitee.created / invitee.canceled from Calendly and records them in
// `bookings`. Create the subscription with Calendly's API (see docs/modules.md)
// and put its signing key in PRIVATE_CALENDLY_WEBHOOK_SIGNING_KEY.
export const POST: RequestHandler = async ({ request, locals }) => {
  requireModule("booking")
  const signingKey = env.PRIVATE_CALENDLY_WEBHOOK_SIGNING_KEY
  if (!signingKey) error(404, "Not found")

  const body = await request.text()
  if (body.length > 200_000) error(413, "Payload too large")
  const valid = await verifyCalendlySignature({
    header: request.headers.get("calendly-webhook-signature"),
    body,
    signingKey,
  })
  if (!valid) error(401, "Invalid signature")

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(body)
  } catch {
    error(400, "Invalid JSON")
  }
  const parsed = calendlyWebhookSchema.safeParse(parsedJson)
  if (!parsed.success) {
    // Unknown event types are acknowledged so Calendly doesn't retry them.
    return json({ received: true, ignored: true })
  }

  const row = bookingFromWebhook(parsed.data)
  const db = locals.db

  // Link to an account when the invitee email matches a user.
  const userId = row.invitee_email
    ? await findUserIdByEmail(db, row.invitee_email)
    : null

  try {
    await upsertBooking(db, row, userId)
  } catch (e) {
    console.error("Booking upsert failed", e instanceof Error ? e.message : e)
    error(500, "Processing failed")
  }

  await captureLead(db, {
    email: row.invitee_email,
    name: row.invitee_name,
    userId,
    source: "booking",
    kind: "booking",
    body: `${row.status === "canceled" ? "Cancelled" : "Booked"} ${row.event_name ?? "a meeting"} for ${row.start_time ?? "unknown time"}`,
    ref: { type: "booking", id: row.external_id },
  })

  if (parsed.data.event === "invitee.created") {
    await sendAdminEmail({
      db,
      subject: "New booking",
      body: `${row.invitee_name ?? "Someone"} (${row.invitee_email ?? "no email"}) booked "${row.event_name ?? "a meeting"}" for ${row.start_time ?? "an unknown time"}.`,
    })
  }
  return json({ received: true })
}
