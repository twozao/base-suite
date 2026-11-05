import { getSettings } from "$lib/server/settings"
import { themeCss } from "$lib/server/theme"
import { isModuleEnabled } from "$lib/modules"
import type { PublicSite } from "$lib/site"
import type { LayoutServerLoad } from "./$types"

// Brand, navigation and theme for every page. Settings are cached per instance (see getSettings).
export const load: LayoutServerLoad = async ({ locals }) => {
  const s = await getSettings(locals.db)
  const site: PublicSite = {
    brand: s.brand,
    navigation: s.navigation,
    announcement: s.general.announcement,
    themeCss: themeCss(s.brand.primaryColor, s.brand.accentColor),
    modules: {
      chat: isModuleEnabled("chat") && s.chat.enabled,
      booking: isModuleEnabled("booking") && s.booking.enabled,
      contact: isModuleEnabled("contact"),
      subscriptions: isModuleEnabled("subscriptions"),
      cms: isModuleEnabled("cms"),
      newsletter: isModuleEnabled("newsletter"),
      // Visitors who send Do Not Track / Global Privacy Control aren't counted
      analytics: isModuleEnabled("analytics"),
      crm: isModuleEnabled("crm"),
    },
  }
  return { site, signedIn: !!locals.user }
}
