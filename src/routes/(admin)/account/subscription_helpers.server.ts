import type { Db } from "$lib/server/db"
import type { SessionUser } from "$lib/server/auth/session"
import type { Plan } from "$lib/server/content_schema"
import { stripeClient } from "$lib/server/billing/stripe"

const NOT_CONFIGURED = "Stripe is not configured (PRIVATE_STRIPE_API_KEY)"

export const getOrCreateCustomerId = async ({
  db,
  user,
}: {
  db: Db
  user: SessionUser
}) => {
  const dbCustomer = await db
    .selectFrom("stripe_customers")
    .select("stripe_customer_id")
    .where("user_id", "=", user.id)
    .executeTakeFirst()
  if (dbCustomer?.stripe_customer_id) {
    return { customerId: dbCustomer.stripe_customer_id }
  }

  const profile = await db
    .selectFrom("profiles")
    .select(["full_name", "website", "company_name"])
    .where("id", "=", user.id)
    .executeTakeFirst()

  const stripe = stripeClient()
  if (!stripe) return { error: NOT_CONFIGURED }
  let customer
  try {
    customer = await stripe.customers.create({
      email: user.email,
      name: profile?.full_name ?? "",
      metadata: {
        user_id: user.id,
        company_name: profile?.company_name ?? "",
        website: profile?.website ?? "",
      },
    })
  } catch (e) {
    return { error: e }
  }
  if (!customer.id) return { error: "Unknown stripe user creation error" }

  // insert instead of upsert so we never over-write; the primary key makes later attempts fail.
  try {
    await db
      .insertInto("stripe_customers")
      .values({ user_id: user.id, stripe_customer_id: customer.id })
      .execute()
  } catch (e) {
    return { error: e }
  }
  return { customerId: customer.id }
}

export const fetchSubscription = async ({
  customerId,
  plans,
}: {
  customerId: string
  plans: Plan[]
}) => {
  const stripe = stripeClient()
  if (!stripe) return { error: NOT_CONFIGURED }
  let stripeSubscriptions
  try {
    stripeSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 100,
      status: "all",
    })
  } catch (e) {
    return { error: e }
  }

  // The "primary" subscription: an active one, including trials and past_due in the grace period.
  const primaryStripeSubscription = stripeSubscriptions.data.find(
    (x) =>
      x.status === "active" ||
      x.status === "trialing" ||
      x.status === "past_due",
  )
  let appSubscription = null
  if (primaryStripeSubscription) {
    const productId =
      primaryStripeSubscription?.items?.data?.[0]?.price.product ?? ""
    appSubscription = plans.find(
      (x) => !!x.stripeProductId && x.stripeProductId === productId,
    )
    if (!appSubscription) {
      return {
        error:
          "Stripe subscription does not match any plan in Admin -> Pricing (by Stripe product id)",
      }
    }
  }
  let primarySubscription = null
  if (primaryStripeSubscription && appSubscription) {
    primarySubscription = {
      stripeSubscription: primaryStripeSubscription,
      appSubscription: appSubscription,
    }
  }
  return {
    primarySubscription,
    hasEverHadSubscription: stripeSubscriptions.data.length > 0,
  }
}
