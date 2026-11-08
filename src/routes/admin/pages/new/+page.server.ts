import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { accessFor, saveContent } from "$lib/server/cms/editor"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  requireModule("cms")
  const staff = await requirePermission(event, "cms.write")
  return { canPublish: accessFor(staff, null).canPublish }
}

export const actions: Actions = {
  default: (event) => saveContent(event, { kind: "page", id: null }),
}
