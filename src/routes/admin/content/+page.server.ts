import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { listTypes } from "$lib/server/cms/types"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  requireModule("cms")
  const staff = await requirePermission(event, "cms.write")
  return {
    types: await listTypes(event.locals.db),
    canDefine: staff.permissions.has("settings.manage"),
  }
}
