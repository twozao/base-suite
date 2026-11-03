import { error, fail, redirect } from "@sveltejs/kit"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { htmlFor, parsePostForm } from "$lib/server/cms/admin"
import { isUuid } from "$lib/server/ids"
import { audit } from "$lib/server/audit"
import type { Actions, PageServerLoad, RequestEvent } from "./$types"

const guard = async (
  event: RequestEvent,
  perm: "cms.edit" | "cms.publish" = "cms.edit",
) => {
  requireModule("cms")
  const staff = await requirePermission(event, perm)
  if (!isUuid(event.params.id)) error(404, "Not found")
  return staff
}

export const load: PageServerLoad = async (event) => {
  const staff = await guard(event)
  const { data: post } = await event.locals.supabaseServiceRole
    .from("posts")
    .select(
      "id, slug, title, body_md, excerpt, seo_title, seo_description, cover_image_url, author_name, tags, status, published_at, updated_at",
    )
    .eq("id", event.params.id)
    .maybeSingle()
  if (!post) error(404, "Post not found")
  return {
    post,
    canPublish: staff.permissions.has("cms.publish"),
    saved: event.url.searchParams.has("saved"),
  }
}

export const actions: Actions = {
  save: async (event) => {
    const staff = await guard(event)
    const result = await parsePostForm(event)
    if ("failure" in result) return result.failure
    const { input, values, publish } = result
    const db = event.locals.supabaseServiceRole
    const { data: existing } = await db
      .from("posts")
      .select("status, published_at")
      .eq("id", event.params.id)
      .maybeSingle()
    if (!existing) error(404, "Not found")
    if (
      (publish || existing.status === "published") &&
      !staff.permissions.has("cms.publish")
    ) {
      return fail(403, {
        errors: { _: "You can't change published posts" },
        values,
      })
    }
    const now = new Date().toISOString()
    const { error: e } = await db
      .from("posts")
      .update({
        ...input,
        body_html: htmlFor(input.body_md),
        status: publish ? "published" : "draft",
        published_at:
          input.published_at ?? existing.published_at ?? (publish ? now : null),
        updated_by: staff.userId,
        updated_at: now,
      })
      .eq("id", event.params.id)
    if (e) {
      if (e.code === "23505")
        return fail(400, {
          errors: { slug: "Another post already uses this URL" },
          values,
        })
      return fail(500, { errors: { _: "Could not save post" }, values })
    }
    await audit(
      event,
      publish ? "post.published" : "post.saved",
      { type: "post", id: event.params.id },
      { slug: input.slug },
    )
    return { message: publish ? "Published" : "Saved as draft" }
  },
  delete: async (event) => {
    await guard(event, "cms.publish")
    const form = await event.request.formData()
    const db = event.locals.supabaseServiceRole
    const { data: post } = await db
      .from("posts")
      .select("slug")
      .eq("id", event.params.id)
      .maybeSingle()
    if (!post) error(404, "Not found")
    if (form.get("confirm") !== post.slug)
      return fail(400, { error: "Type the post URL to confirm deletion" })
    await db.from("posts").delete().eq("id", event.params.id)
    await audit(
      event,
      "post.deleted",
      { type: "post", id: event.params.id },
      { slug: post.slug },
    )
    redirect(303, "/admin/blog")
  },
}
