import { getSettings } from "$lib/server/settings"
import { themeCss, THEMES } from "$lib/server/theme"
import { isModuleEnabled } from "$lib/modules"
import type { PublicSite } from "$lib/site"
import type { LayoutServerLoad } from "./$types"
import { error } from "@sveltejs/kit"
import {
  localeFor,
  navLabels,
  translateNavigation,
} from "$lib/server/translations"

// Brand, navigation and theme for every page. Settings are cached per instance (see getSettings).
export const load: LayoutServerLoad = async ({ locals, url }) => {
  const s = await getSettings(locals.db)
  const lang = await localeFor(locals.db, url)
  if (!lang) error(404, "Not found")
  const translated = lang.locale !== lang.defaultLocale
  const site: PublicSite = {
    brand: s.brand,
    navigation: translated
      ? translateNavigation(
          s.navigation,
          await navLabels(locals.db, lang.locale),
          lang.locale,
          lang.defaultLocale,
        )
      : s.navigation,
    locale: lang.locale,
    defaultLocale: lang.defaultLocale,
    locales: lang.locales,
    announcement: s.general.announcement,
    signIn: s.signin.enabled,
    themeCss: themeCss(
      s.brand.primaryColor,
      s.brand.accentColor,
      s.brand.theme,
    ),
    heroLayout: THEMES[s.brand.theme].heroLayout,
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
      assistant: isModuleEnabled("assistant"),
      helpdesk: isModuleEnabled("helpdesk"),
      kb: isModuleEnabled("kb"),
      forms: isModuleEnabled("forms"),
      projects: isModuleEnabled("projects"),
    },
  }
  return { site, signedIn: !!locals.user }
}
