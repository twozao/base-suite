import { error, json } from "@sveltejs/kit"
import { env } from "$env/dynamic/private"
import {
  bookingFromWebhook,
  calendlyWebhookSchema,
  verifyCalendlySignature,
} from "$lib/server/booking/calendly"
import { requireModule } from "$lib/server/auth/staff"
import { sendAdminEmail } from "$lib/mailer"
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
  const db = locals.supabaseServiceRole

  // Link to an account when the invitee email matches a user's profile.
  let userId: string | null = null
  if (row.invitee_email) {
    const { data: users } = await db.rpc("admin_list_users", {
      p_search: row.invitee_email,
      p_limit: 5,
      p_offset: 0,
    })
    userId =
      users?.find((u) => u.email.toLowerCase() === row.invitee_email)?.id ??
      null
  }

  const { error: upsertError } = await db
    .from("bookings")
    .upsert({ ...row, user_id: userId }, { onConflict: "external_id" })
  if (upsertError) {
    console.error("Booking upsert failed", upsertError.message)
    error(500, "Processing failed")
  }

  if (parsed.data.event === "invitee.created") {
    await sendAdminEmail({
      subject: "New booking",
      body: `${row.invitee_name ?? "Someone"} (${row.invitee_email ?? "no email"}) booked "${row.event_name ?? "a meeting"}" for ${row.start_time ?? "an unknown time"}.`,
    })
  }
  return json({ received: true })
}
