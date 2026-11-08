import { error, fail } from "@sveltejs/kit"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { isUuid } from "$lib/server/ids"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  requireModule("forms")
  await requirePermission(event, "forms.manage")
  if (!isUuid(event.params.id)) error(404, "Not found")
  const db = event.locals.db
  const form = await db
    .selectFrom("forms")
    .select(["id", "title", "slug"])
    .where("id", "=", event.params.id)
    .executeTakeFirst()
  if (!form) error(404, "Form not found")
  const rows = await db
    .selectFrom("form_submissions")
    .selectAll()
    .where("form_id", "=", form.id)
    .orderBy("created_at", "desc")
    .limit(500)
    .execute()
  return {
    form,
    submissions: rows.map((r) => ({
      ...r,
      answers: JSON.parse(r.answers) as { label: string; value: string }[],
    })),
  }
}

export const actions: Actions = {
  mark: async (event) => {
    requireModule("forms")
    await requirePermission(event, "forms.manage")
    const fd = await event.request.formData()
    const id = String(fd.get("id") ?? "")
    const to = String(fd.get("to") ?? "")
    if (!isUuid(id) || !["new", "read", "spam"].includes(to))
      return fail(400, { error: "Invalid request" })
    if (to === "delete") return fail(400, { error: "Invalid request" })
    await event.locals.db
      .updateTable("form_submissions")
      .set({ status: to as "new" })
      .where("id", "=", id)
      .where("form_id", "=", event.params.id)
      .execute()
    return { message: "Updated" }
  },
}
