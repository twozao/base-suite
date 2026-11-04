import { requirePermission } from "$lib/server/auth/staff"
import { getSettings } from "$lib/server/settings"
import { saveJsonSetting } from "$lib/server/admin_forms"
import { ICONS } from "$lib/server/content_schema"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  await requirePermission(event, "cms.edit")
  const s = await getSettings(event.locals.db)
  return { home: s.home, icons: [...ICONS] }
}

export const actions: Actions = {
  default: (event) => saveJsonSetting(event, "home", "cms.edit"),
}
