import { env } from "$env/dynamic/private"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { getSettings } from "$lib/server/settings"
import { saveJsonSetting } from "$lib/server/admin_forms"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  requireModule("subscriptions")
  await requirePermission(event, "settings.manage")
  const s = await getSettings(event.locals.supabaseServiceRole)
  const key = env.PRIVATE_STRIPE_API_KEY ?? ""
  return {
    pricing: s.pricing,
    stripeMode: key.startsWith("sk_live_")
      ? "live"
      : key.startsWith("sk_test_")
        ? "test"
        : "missing",
  }
}

export const actions: Actions = {
  default: (event) => {
    requireModule("subscriptions")
    return saveJsonSetting(event, "pricing", "settings.manage")
  },
}
