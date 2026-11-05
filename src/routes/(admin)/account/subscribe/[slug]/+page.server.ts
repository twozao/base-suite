import { error, redirect } from "@sveltejs/kit"
import { stripeClient } from "$lib/server/billing/stripe"
import {
  fetchSubscription,
  getOrCreateCustomerId,
} from "../../subscription_helpers.server"
import type { PageServerLoad } from "./$types"
import { getSettings } from "$lib/server/settings"

export const load: PageServerLoad = async ({
  params,
  url,
  locals: { db, user },
}) => {
  if (!user) {
    redirect(303, "/login")
  }

  // The URL names one of the plans from Admin -> Pricing. Only that plan's
  // configured Stripe price can be checked out (never a price id from the URL).
  const { pricing } = await getSettings(db)
  const plan = pricing.plans.find((p) => p.id === params.slug)
  if (!plan) error(404, "Plan not found")
  if (!plan.stripePriceId) {
    // Free plan, or a paid plan that isn't connected to Stripe yet
    redirect(303, "/account")
  }

  const { error: idError, customerId } = await getOrCreateCustomerId({
    db,
    user,
  })
  if (idError || !customerId) {
    console.error("Error creating customer id", idError)
    error(500, {
      message: "Unknown error. If issue persists, please contact us.",
    })
  }

  const { primarySubscription } = await fetchSubscription({
    customerId,
    plans: pricing.plans,
  })
  if (primarySubscription) {
    // User already has plan, we shouldn't let them buy another
    redirect(303, "/account/billing")
  }

  const stripe = stripeClient()
  if (!stripe) {
    console.error("Checkout requested without PRIVATE_STRIPE_API_KEY")
    error(
      500,
      "Billing is not configured. If issue persists, please contact us.",
    )
  }
  let checkoutUrl
  try {
    const stripeSession = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      customer: customerId,
      mode: "subscription",
      success_url: `${url.origin}/account`,
      cancel_url: `${url.origin}/account/billing`,
    })
    checkoutUrl = stripeSession.url
  } catch (e) {
    console.error("Error creating checkout session", e)
    error(500, "Unknown Error (SSE): If issue persists please contact us.")
  }

  redirect(303, checkoutUrl ?? "/pricing")
}
