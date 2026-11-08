import { requirePermission } from "$lib/server/auth/staff"
import { getSettings } from "$lib/server/settings"
import { saveJsonSetting } from "$lib/server/admin_forms"
import { THEMES, THEME_IDS } from "$lib/server/theme"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  await requirePermission(event, "settings.manage")
  const db = event.locals.db
  const [s, pages] = await Promise.all([
    getSettings(db),
    db
      .selectFrom("cms_pages")
      .select(["slug", "title"])
      .where("status", "=", "published")
      .orderBy("title")
      .limit(100)
      .execute(),
  ])
  return {
    brand: s.brand,
    navigation: s.navigation,
    general: s.general,
    pages,
    themes: THEME_IDS.map((id) => ({ id, ...THEMES[id] })),
  }
}

export const actions: Actions = {
  brand: (event) => saveJsonSetting(event, "brand", "settings.manage", "brand"),
  navigation: (event) =>
    saveJsonSetting(event, "navigation", "settings.manage", "navigation"),
  general: (event) =>
    saveJsonSetting(event, "general", "settings.manage", "general"),
}
