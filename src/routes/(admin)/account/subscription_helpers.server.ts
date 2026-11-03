import type { SupabaseClient, User } from "@supabase/supabase-js"
import type { Database } from "../../../DatabaseDefinitions"
import type { Plan } from "$lib/server/content_schema"
import { stripeClient } from "$lib/server/billing/stripe"

const NOT_CONFIGURED = "Stripe is not configured (PRIVATE_STRIPE_API_KEY)"

export const getOrCreateCustomerId = async ({
  supabaseServiceRole,
  user,
}: {
  supabaseServiceRole: SupabaseClient<Database>
  user: User
}) => {
  const { data: dbCustomer, error } = await supabaseServiceRole
    .from("stripe_customers")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single()

  if (error && error.code != "PGRST116") {
    // PGRST116 == no rows
    return { error: error }
  }

  if (dbCustomer?.stripe_customer_id) {
    return { customerId: dbCustomer.stripe_customer_id }
  }

  // Fetch data needed to create customer
  const { data: profile, error: profileError } = await supabaseServiceRole
    .from("profiles")
    .select(`full_name, website, company_name`)
    .eq("id", user.id)
    .single()
  if (profileError) {
    return { error: profileError }
  }

  const stripe = stripeClient()
  if (!stripe) return { error: NOT_CONFIGURED }
  let customer
  try {
    customer = await stripe.customers.create({
      email: user.email,
      name: profile.full_name ?? "",
      metadata: {
        user_id: user.id,
        company_name: profile.company_name ?? "",
        website: profile.website ?? "",
      },
    })
  } catch (e) {
    return { error: e }
  }

  if (!customer.id) {
    return { error: "Unknown stripe user creation error" }
  }

  // insert instead of upsert so we never over-write. PK ensures later attempts error.
  const { error: insertError } = await supabaseServiceRole
    .from("stripe_customers")
    .insert({
      user_id: user.id,
      stripe_customer_id: customer.id,
      updated_at: new Date(),
    })

  if (insertError) {
    return { error: insertError }
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

  // find "primary". The user may have several old ones, we want an active one (including trials, and past_due in grace period).
  const primaryStripeSubscription = stripeSubscriptions.data.find((x) => {
    return (
      x.status === "active" ||
      x.status === "trialing" ||
      x.status === "past_due"
    )
  })
  let appSubscription = null
  if (primaryStripeSubscription) {
    const productId =
      primaryStripeSubscription?.items?.data?.[0]?.price.product ?? ""
    appSubscription = plans.find((x) => {
      return !!x.stripeProductId && x.stripeProductId === productId
    })
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

  const hasEverHadSubscription = stripeSubscriptions.data.length > 0

  return {
    primarySubscription,
    hasEverHadSubscription,
  }
}
