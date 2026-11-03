import { error } from "@sveltejs/kit"
import { getSettings } from "$lib/server/settings"
import { plansForDisplay } from "$lib/server/pricing"
import { requireModule } from "$lib/server/auth/staff"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ locals }) => {
  requireModule("subscriptions")
  const s = await getSettings(locals.supabaseServiceRole)
  if (!s.pricing.plans.length) error(404, "Not found")
  return {
    pricing: {
      title: s.pricing.title,
      subtitle: s.pricing.subtitle,
      faq: s.pricing.faq,
    },
    plans: plansForDisplay(s.pricing.plans, !!locals.user),
  }
}
