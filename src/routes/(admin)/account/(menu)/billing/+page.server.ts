import { error, redirect } from "@sveltejs/kit"
import {
  fetchSubscription,
  getOrCreateCustomerId,
} from "../../subscription_helpers.server"
import type { PageServerLoad } from "./$types"
import { getSettings } from "$lib/server/settings"
import { plansForDisplay } from "$lib/server/pricing"

export const load: PageServerLoad = async ({
  locals: { safeGetSession, supabaseServiceRole },
}) => {
  const { session, user } = await safeGetSession()
  if (!session || !user?.id) {
    redirect(303, "/login")
  }

  const { error: idError, customerId } = await getOrCreateCustomerId({
    supabaseServiceRole,
    user,
  })
  if (idError || !customerId) {
    console.error("Error creating customer id", idError)
    error(500, {
      message: "Unknown error. If issue persists, please contact us.",
    })
  }

  const { pricing } = await getSettings(supabaseServiceRole)
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
    isActiveCustomer: !!primarySubscription,
    hasEverHadSubscription,
    currentPlanId:
      primarySubscription?.appSubscription?.id ?? pricing.plans[0]?.id,
    currentPlanName: primarySubscription?.appSubscription?.name ?? "",
    plans: plansForDisplay(pricing.plans, true),
  }
}
