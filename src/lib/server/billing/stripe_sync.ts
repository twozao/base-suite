import type Stripe from "stripe"
import type { Db } from "../db"
import { isUniqueViolation } from "../db/errors"
import { nowIso } from "../db/json"
import type { NewSubscription } from "../db/schema"

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
): NewSubscription => {
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
    cancel_at_period_end: sub.cancel_at_period_end ? 1 : 0,
    updated_at: nowIso(),
  }
}

/**
 * Process a verified Stripe event. Idempotent: each event id is recorded in stripe_events and
 * skipped if seen before.
 */
export const handleStripeEvent = async (
  db: Db,
  event: Stripe.Event,
): Promise<{ status: "processed" | "duplicate" | "ignored" }> => {
  if (!SUBSCRIPTION_EVENTS.has(event.type)) return { status: "ignored" }

  try {
    await db
      .insertInto("stripe_events")
      .values({ id: event.id, type: event.type })
      .execute()
  } catch (e) {
    if (isUniqueViolation(e)) return { status: "duplicate" }
    throw e
  }

  try {
    const sub = event.data.object as Stripe.Subscription
    const customerId =
      typeof sub.customer === "string" ? sub.customer : sub.customer.id
    const customer = await db
      .selectFrom("stripe_customers")
      .select("user_id")
      .where("stripe_customer_id", "=", customerId)
      .executeTakeFirst()

    const row = subscriptionRow(sub, customer?.user_id ?? null)
    const { id, ...rest } = row
    await db
      .insertInto("subscriptions")
      .values({ id, ...rest })
      .onConflict((oc) => oc.column("id").doUpdateSet(rest))
      .execute()

    // CRM: an active subscriber is a customer (best effort, never blocks billing)
    if (
      customer?.user_id &&
      (sub.status === "active" || sub.status === "trialing")
    ) {
      await db
        .updateTable("crm_contacts")
        .set({ status: "customer", last_activity_at: nowIso() })
        .where("user_id", "=", customer.user_id)
        .where("status", "!=", "customer")
        .execute()
    }
  } catch (e) {
    // Let Stripe retry: forget that we saw this event.
    await db.deleteFrom("stripe_events").where("id", "=", event.id).execute()
    throw e
  }
  return { status: "processed" }
}
