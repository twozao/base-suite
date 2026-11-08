import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { saveJsonSetting } from "$lib/server/admin_forms"
import { getSettings } from "$lib/server/settings"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  requireModule("booking")
  await requirePermission(event, "settings.manage")
  const { availability } = await getSettings(event.locals.db)
  return { availability, zones: Intl.supportedValuesOf("timeZone") }
}

export const actions: Actions = {
  default: (event) => {
    requireModule("booking")
    return saveJsonSetting(event, "availability", "settings.manage")
  },
}
