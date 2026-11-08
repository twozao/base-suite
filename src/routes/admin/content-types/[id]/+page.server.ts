import { error, fail, redirect } from "@sveltejs/kit"
import { requirePermission } from "$lib/server/auth/staff"
import { FIELD_LABELS, listTypes, typeBy } from "$lib/server/cms/types"
import { saveType } from "$lib/server/cms/types_admin"
import { bumpCacheVersion } from "$lib/server/cache"
import { isUuid } from "$lib/server/ids"
import { audit } from "$lib/server/audit"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  await requirePermission(event, "settings.manage")
  const isNew = event.params.id === "new"
  if (!isNew && !isUuid(event.params.id)) error(404, "Not found")
  const type = isNew
    ? null
    : await typeBy(event.locals.db, "id", event.params.id)
  if (!isNew && !type) error(404, "Content type not found")
  const all = await listTypes(event.locals.db)
  return {
    type,
    labels: FIELD_LABELS,
    others: all.map((t) => ({ slug: t.slug, name: t.name })),
    saved: event.url.searchParams.has("saved"),
  }
}

export const actions: Actions = {
  save: (event) =>
    saveType(event, event.params.id === "new" ? null : event.params.id),
  delete: async (event) => {
    await requirePermission(event, "settings.manage")
    if (!isUuid(event.params.id)) error(404, "Not found")
    const db = event.locals.db
    const type = await typeBy(db, "id", event.params.id)
    if (!type) error(404, "Not found")
    const form = await event.request.formData()
    if (form.get("confirm") !== type.slug)
      return fail(400, { error: "Type the content type name to confirm" })
    await db.deleteFrom("content_types").where("id", "=", type.id).execute()
    await bumpCacheVersion(db)
    await audit(
      event,
      "content_type.deleted",
      { type: "content_type", id: type.id },
      { slug: type.slug },
    )
    redirect(303, "/admin/content-types")
  },
}
