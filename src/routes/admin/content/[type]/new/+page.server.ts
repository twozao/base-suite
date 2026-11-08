import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { accessFor, saveContent, typeFromParams } from "$lib/server/cms/editor"
import { relationOptions } from "$lib/server/cms/entries_admin"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  requireModule("cms")
  const staff = await requirePermission(event, "cms.write")
  const type = await typeFromParams(event.locals.db, event.params.type)
  return {
    type,
    relations: await relationOptions(event.locals.db, type),
    canPublish: accessFor(staff, null).canPublish,
  }
}

export const actions: Actions = {
  default: async (event) => {
    const type = await typeFromParams(event.locals.db, event.params.type)
    return saveContent(event, { kind: "entry", id: null, type })
  },
}
