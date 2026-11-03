import { fail, redirect } from "@sveltejs/kit"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { htmlFor, parsePostForm } from "$lib/server/cms/admin"
import { audit } from "$lib/server/audit"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  requireModule("cms")
  const staff = await requirePermission(event, "cms.edit")
  const { data: profile } = await event.locals.supabaseServiceRole
    .from("profiles")
    .select("full_name")
    .eq("id", staff.userId)
    .maybeSingle()
  return {
    canPublish: staff.permissions.has("cms.publish"),
    author: profile?.full_name ?? "",
  }
}

export const actions: Actions = {
  default: async (event) => {
    requireModule("cms")
    const staff = await requirePermission(event, "cms.edit")
    const result = await parsePostForm(event)
    if ("failure" in result) return result.failure
    const { input, values, publish } = result
    if (publish && !staff.permissions.has("cms.publish"))
      return fail(403, { errors: { _: "You can't publish posts" }, values })
    const { data, error } = await event.locals.supabaseServiceRole
      .from("posts")
      .insert({
        ...input,
        body_html: htmlFor(input.body_md),
        status: publish ? "published" : "draft",
        published_at: publish
          ? (input.published_at ?? new Date().toISOString())
          : input.published_at,
        created_by: staff.userId,
        updated_by: staff.userId,
      })
      .select("id")
      .single()
    if (error) {
      if (error.code === "23505")
        return fail(400, {
          errors: { slug: "Another post already uses this URL" },
          values,
        })
      return fail(500, { errors: { _: "Could not save post" }, values })
    }
    await audit(
      event,
      publish ? "post.published" : "post.created",
      { type: "post", id: data.id },
      { slug: input.slug },
    )
    redirect(303, `/admin/blog/${data.id}?saved=1`)
  },
}
