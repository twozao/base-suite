import { error, json } from "@sveltejs/kit"
import Stripe from "stripe"
import { env } from "$env/dynamic/private"
import { handleStripeEvent } from "$lib/server/billing/stripe_sync"
import { stripeClient } from "$lib/server/billing/stripe"
import { requireModule } from "$lib/server/auth/staff"
import type { RequestHandler } from "./$types"

// Keeps the `subscriptions` table in sync so the admin portal can list
// subscribers without calling Stripe for every user.
// Configure in Stripe: Developers -> Webhooks -> endpoint
//   https://YOUR_DOMAIN/api/webhooks/stripe  with customer.subscription.* events
export const POST: RequestHandler = async ({ request, locals }) => {
  requireModule("subscriptions")
  const secret = env.PRIVATE_STRIPE_WEBHOOK_SECRET
  const stripe = stripeClient()
  if (!secret || !stripe) error(404, "Not found")

  const signature = request.headers.get("stripe-signature")
  if (!signature) error(400, "Missing signature")
  const body = await request.text()
  if (body.length > 1_000_000) error(413, "Payload too large")

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      secret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    )
  } catch {
    error(400, "Invalid signature")
  }

  try {
    const result = await handleStripeEvent(locals.db, event)
    return json({ received: true, ...result })
  } catch (e) {
    console.error("Stripe webhook processing failed", event.id, e)
    error(500, "Processing failed")
  }
}
