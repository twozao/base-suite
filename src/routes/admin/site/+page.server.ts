import { requirePermission } from "$lib/server/auth/staff"
import { getSettings } from "$lib/server/settings"
import { saveJsonSetting } from "$lib/server/admin_forms"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  await requirePermission(event, "settings.manage")
  const s = await getSettings(event.locals.supabaseServiceRole)
  const { data: pages } = await event.locals.supabaseServiceRole
    .from("cms_pages")
    .select("slug, title")
    .eq("status", "published")
    .order("title")
    .limit(100)
  return {
    brand: s.brand,
    navigation: s.navigation,
    general: s.general,
    pages: pages ?? [],
  }
}

export const actions: Actions = {
  brand: (event) => saveJsonSetting(event, "brand", "settings.manage", "brand"),
  navigation: (event) =>
    saveJsonSetting(event, "navigation", "settings.manage", "navigation"),
  general: (event) =>
    saveJsonSetting(event, "general", "settings.manage", "general"),
}
