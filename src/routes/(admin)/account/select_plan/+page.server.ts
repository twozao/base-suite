import { redirect } from "@sveltejs/kit"
import { requireModule } from "$lib/server/auth/staff"
import { getSettings } from "$lib/server/settings"
import { plansForDisplay } from "$lib/server/pricing"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ locals, parent }) => {
  requireModule("subscriptions")
  const { askForPlan } = await parent()
  if (!askForPlan) redirect(303, "/account")
  const { pricing } = await getSettings(locals.db)
  return { plans: plansForDisplay(pricing.plans, true) }
}
