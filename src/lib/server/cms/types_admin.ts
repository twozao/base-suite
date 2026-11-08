import { fail, redirect, type RequestEvent } from "@sveltejs/kit"
import { audit } from "../audit"
import { requirePermission } from "../auth/staff"
import { bumpCacheVersion } from "../cache"
import { isUniqueViolation } from "../db/errors"
import { nowIso } from "../db/json"
import { prefixProblem, typeInputSchema } from "./types"

// Create and update content type definitions from the admin form.

export const readTypeForm = (form: FormData) => {
  const s = (k: string) => String(form.get(k) ?? "")
  return {
    name: s("name"),
    singular: s("singular"),
    slug: s("slug"),
    url_prefix: s("url_prefix"),
    description: s("description"),
    has_archive: form.get("has_archive") ? "1" : "",
    in_search: form.get("in_search") ? "1" : "",
    fields: s("fields"),
  }
}

export const saveType = async (event: RequestEvent, id: string | null) => {
  const staff = await requirePermission(event, "settings.manage")
  const db = event.locals.db
  const values = readTypeForm(await event.request.formData())
  let fields: unknown = []
  try {
    fields = values.fields ? JSON.parse(values.fields) : []
  } catch {
    return fail(400, {
      errors: { fields: "The fields could not be read" },
      values,
    })
  }
  const parsed = typeInputSchema.safeParse({
    ...values,
    has_archive: !!values.has_archive,
    in_search: !!values.in_search,
    fields,
  })
  if (!parsed.success) {
    const errors: Record<string, string> = {}
    for (const i of parsed.error.issues) {
      const key = i.path[0] === "fields" ? "fields" : String(i.path[0] ?? "_")
      errors[key] ??= i.message
    }
    return fail(400, { errors, values })
  }
  const input = parsed.data
  const clash = await prefixProblem(db, input.url_prefix, id)
  if (clash) return fail(400, { errors: { url_prefix: clash }, values })
  const row = {
    name: input.name,
    singular: input.singular,
    slug: input.slug,
    url_prefix: input.url_prefix,
    description: input.description,
    has_archive: input.has_archive ? 1 : 0,
    in_search: input.in_search ? 1 : 0,
    fields_json: JSON.stringify(input.fields),
    updated_at: nowIso(),
  }
  const newId = id ?? crypto.randomUUID()
  try {
    if (id)
      await db
        .updateTable("content_types")
        .set(row)
        .where("id", "=", id)
        .execute()
    else
      await db
        .insertInto("content_types")
        .values({ id: newId, ...row })
        .execute()
  } catch (e) {
    if (isUniqueViolation(e))
      return fail(400, {
        errors: { slug: "Another content type uses this name or URL" },
        values,
      })
    throw e
  }
  await bumpCacheVersion(db)
  await audit(
    event,
    "content_type.saved",
    { type: "content_type", id: newId },
    { slug: input.slug, by: staff.userId },
  )
  if (!id) redirect(303, `/admin/content-types/${newId}?saved=1`)
  return { message: "Saved" }
}
