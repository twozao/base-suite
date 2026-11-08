import { fail, redirect } from "@sveltejs/kit"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { htmlFor, parsePageForm } from "$lib/server/cms/admin"
import { isUniqueViolation } from "$lib/server/db/errors"
import { nowIso } from "$lib/server/db/json"
import { audit } from "$lib/server/audit"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  requireModule("cms")
  const staff = await requirePermission(event, "cms.edit")
  return { canPublish: staff.permissions.has("cms.publish") }
}

export const actions: Actions = {
  default: async (event) => {
    requireModule("cms")
    const staff = await requirePermission(event, "cms.edit")
    const result = await parsePageForm(event)
    if ("failure" in result) return result.failure
    const { input, values, publish } = result
    if (publish && !staff.permissions.has("cms.publish")) {
      return fail(403, { errors: { _: "You can't publish pages" }, values })
    }
    const id = crypto.randomUUID()
    const now = nowIso()
    try {
      // The page and its first revision land together or not at all (on D1, one after the other).
      await event.locals.db.transaction().execute(async (trx) => {
        await trx
          .insertInto("cms_pages")
          .values({
            id,
            ...input,
            body_html: htmlFor(input.body_md),
            status: publish ? "published" : "draft",
            published_at: publish ? now : null,
            created_by: staff.userId,
            updated_by: staff.userId,
          })
          .execute()
        await trx
          .insertInto("cms_page_revisions")
          .values({
            page_id: id,
            title: input.title,
            body_md: input.body_md,
            saved_by: staff.userId,
          })
          .execute()
      })
    } catch (e) {
      if (isUniqueViolation(e))
        return fail(400, {
          errors: { slug: "Another page already uses this URL" },
          values,
        })
      console.error("page create failed", e instanceof Error ? e.message : e)
      return fail(500, { errors: { _: "Could not save page" }, values })
    }
    await audit(
      event,
      publish ? "page.published" : "page.created",
      { type: "page", id },
      { slug: input.slug },
    )
    redirect(303, `/admin/pages/${id}?saved=1`)
  },
}
