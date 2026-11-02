import { fail, redirect } from "@sveltejs/kit"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { htmlFor, parsePageForm } from "$lib/server/cms/admin"
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
    const now = new Date().toISOString()
    const { data, error } = await event.locals.supabaseServiceRole
      .from("cms_pages")
      .insert({
        ...input,
        body_html: htmlFor(input.body_md),
        status: publish ? "published" : "draft",
        published_at: publish ? now : null,
        created_by: staff.userId,
        updated_by: staff.userId,
      })
      .select("id")
      .single()
    if (error) {
      if (error.code === "23505")
        return fail(400, {
          errors: { slug: "Another page already uses this URL" },
          values,
        })
      return fail(500, { errors: { _: "Could not save page" }, values })
    }
    await event.locals.supabaseServiceRole.from("cms_page_revisions").insert({
      page_id: data.id,
      title: input.title,
      body_md: input.body_md,
      saved_by: staff.userId,
    })
    await audit(
      event,
      publish ? "page.published" : "page.created",
      { type: "page", id: data.id },
      { slug: input.slug },
    )
    redirect(303, `/admin/pages/${data.id}?saved=1`)
  },
}
