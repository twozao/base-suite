import type Stripe from "stripe"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "../../../DatabaseDefinitions"

export const SUBSCRIPTION_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
])

/** Map a Stripe subscription to our mirror row. Pure, for testing. */
export const subscriptionRow = (
  sub: Stripe.Subscription,
  userId: string | null,
) => {
  const item = sub.items?.data?.[0]
  const product = item?.price?.product
  return {
    id: sub.id,
    user_id: userId,
    stripe_customer_id:
      typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    status: sub.status,
    price_id: item?.price?.id ?? null,
    product_id: typeof product === "string" ? product : (product?.id ?? null),
    current_period_end: sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null,
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
    updated_at: new Date().toISOString(),
  }
}

/**
 * Process a verified Stripe event. Idempotent: each event id is recorded in
 * stripe_events and skipped if seen before.
 */
export const handleStripeEvent = async (
  db: SupabaseClient<Database>,
  event: Stripe.Event,
): Promise<{ status: "processed" | "duplicate" | "ignored" }> => {
  if (!SUBSCRIPTION_EVENTS.has(event.type)) return { status: "ignored" }

  const { error: dupError } = await db
    .from("stripe_events")
    .insert({ id: event.id, type: event.type })
  if (dupError) {
    if (dupError.code === "23505") return { status: "duplicate" }
    throw new Error(`stripe_events insert failed: ${dupError.message}`)
  }

  try {
    const sub = event.data.object as Stripe.Subscription
    const customerId =
      typeof sub.customer === "string" ? sub.customer : sub.customer.id
    const { data: customer } = await db
      .from("stripe_customers")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle()

    const { error } = await db
      .from("subscriptions")
      .upsert(subscriptionRow(sub, customer?.user_id ?? null))
    if (error) throw new Error(`subscriptions upsert failed: ${error.message}`)

    // CRM: an active subscriber is a customer (best effort, never blocks billing)
    if (
      customer?.user_id &&
      (sub.status === "active" || sub.status === "trialing")
    ) {
      await db
        .from("crm_contacts")
        .update({
          status: "customer",
          last_activity_at: new Date().toISOString(),
        })
        .eq("user_id", customer.user_id)
        .neq("status", "customer")
    }
  } catch (e) {
    // Let Stripe retry: forget that we saw this event.
    await db.from("stripe_events").delete().eq("id", event.id)
    throw e
  }
  return { status: "processed" }
}
