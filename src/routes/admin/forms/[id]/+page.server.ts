import { error, fail, redirect } from "@sveltejs/kit"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { audit } from "$lib/server/audit"
import { isUniqueViolation } from "$lib/server/db/errors"
import { nowIso } from "$lib/server/db/json"
import { formSchema, parseFields } from "$lib/server/forms"
import { isUuid } from "$lib/server/ids"
import type { Actions, PageServerLoad, RequestEvent } from "./$types"

const guard = async (event: RequestEvent) => {
  requireModule("forms")
  await requirePermission(event, "forms.manage")
  if (!isUuid(event.params.id)) error(404, "Not found")
}

export const load: PageServerLoad = async (event) => {
  await guard(event)
  const f = await event.locals.db
    .selectFrom("forms")
    .selectAll()
    .where("id", "=", event.params.id)
    .executeTakeFirst()
  if (!f) error(404, "Form not found")
  return {
    form: {
      ...f,
      fields: parseFields(f.fields),
      active: !!f.active,
      notify_admin: !!f.notify_admin,
    },
  }
}

export const actions: Actions = {
  save: async (event) => {
    await guard(event)
    const fd = await event.request.formData()
    let fields: unknown = []
    try {
      fields = JSON.parse(String(fd.get("fields") ?? "[]"))
    } catch {
      return fail(400, { error: "The fields could not be read" })
    }
    const parsed = formSchema.safeParse({
      title: fd.get("title"),
      slug: fd.get("slug"),
      description: fd.get("description") ?? "",
      submit_label: fd.get("submit_label") || "Send",
      success_message: fd.get("success_message") || "Thanks, we got it.",
      notify_admin: fd.get("notify_admin") === "on",
      active: fd.get("active") === "on",
      fields,
    })
    if (!parsed.success) {
      const i = parsed.error.issues[0]
      return fail(400, { error: `${i.path.join(" ")}: ${i.message}` })
    }
    const ids = new Set<string>()
    for (const f of parsed.data.fields) {
      if (ids.has(f.id))
        return fail(400, { error: `Two fields use the key ${f.id}` })
      ids.add(f.id)
    }
    const d = parsed.data
    try {
      await event.locals.db
        .updateTable("forms")
        .set({
          ...d,
          fields: JSON.stringify(d.fields),
          notify_admin: d.notify_admin ? 1 : 0,
          active: d.active ? 1 : 0,
          updated_at: nowIso(),
        })
        .where("id", "=", event.params.id)
        .execute()
    } catch (e) {
      if (isUniqueViolation(e))
        return fail(400, { error: "Another form uses this address" })
      throw e
    }
    await audit(event, "form.saved", { type: "form", id: event.params.id })
    return { message: "Saved" }
  },
  delete: async (event) => {
    await guard(event)
    await event.locals.db
      .deleteFrom("form_submissions")
      .where("form_id", "=", event.params.id)
      .execute()
    await event.locals.db
      .deleteFrom("forms")
      .where("id", "=", event.params.id)
      .execute()
    await audit(event, "form.deleted", { type: "form", id: event.params.id })
    redirect(303, "/admin/forms")
  },
}
