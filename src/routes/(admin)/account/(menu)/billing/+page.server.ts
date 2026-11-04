import { error, redirect } from "@sveltejs/kit"
import {
  fetchSubscription,
  getOrCreateCustomerId,
} from "../../subscription_helpers.server"
import type { PageServerLoad } from "./$types"
import { getSettings } from "$lib/server/settings"
import { plansForDisplay } from "$lib/server/pricing"
import { stripeClient } from "$lib/server/billing/stripe"

export const load: PageServerLoad = async ({ locals: { db, user } }) => {
  if (!user) {
    redirect(303, "/login")
  }

  // Without a Stripe key there is nothing to check out; show the plans and say so instead of failing.
  if (!stripeClient()) {
    const { pricing } = await getSettings(db)
    return {
      billingUnavailable: true,
      isActiveCustomer: false,
      hasEverHadSubscription: false,
      currentPlanId: pricing.plans[0]?.id,
      currentPlanName: "",
      plans: plansForDisplay(pricing.plans, true),
    }
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

  const { pricing } = await getSettings(db)
  const {
    primarySubscription,
    hasEverHadSubscription,
    error: fetchErr,
  } = await fetchSubscription({
    customerId,
    plans: pricing.plans,
  })
  if (fetchErr) {
    console.error("Error fetching subscription", fetchErr)
    error(500, {
      message: "Unknown error. If issue persists, please contact us.",
    })
  }

  return {
    billingUnavailable: false,
    isActiveCustomer: !!primarySubscription,
    hasEverHadSubscription,
    currentPlanId:
      primarySubscription?.appSubscription?.id ?? pricing.plans[0]?.id,
    currentPlanName: primarySubscription?.appSubscription?.name ?? "",
    plans: plansForDisplay(pricing.plans, true),
  }
}
