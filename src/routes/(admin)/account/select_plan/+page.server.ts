import { getSettings } from "$lib/server/settings"
import { plansForDisplay } from "$lib/server/pricing"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ locals }) => {
  const { pricing } = await getSettings(locals.supabaseServiceRole)
  return { plans: plansForDisplay(pricing.plans, true) }
}
