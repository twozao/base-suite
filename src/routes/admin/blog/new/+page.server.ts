import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { accessFor, saveContent } from "$lib/server/cms/editor"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  requireModule("cms")
  const staff = await requirePermission(event, "cms.write")
  const profile = await event.locals.db
    .selectFrom("profiles")
    .select("full_name")
    .where("id", "=", staff.userId)
    .executeTakeFirst()
  return {
    canPublish: accessFor(staff, null).canPublish,
    author: profile?.full_name ?? "",
  }
}

export const actions: Actions = {
  default: (event) => saveContent(event, { kind: "post", id: null }),
}
