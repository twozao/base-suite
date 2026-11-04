import { fail, redirect } from "@sveltejs/kit"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { htmlFor, parsePostForm } from "$lib/server/cms/admin"
import { isUniqueViolation } from "$lib/server/db/errors"
import { nowIso } from "$lib/server/db/json"
import { audit } from "$lib/server/audit"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  requireModule("cms")
  const staff = await requirePermission(event, "cms.edit")
  const profile = await event.locals.db
    .selectFrom("profiles")
    .select("full_name")
    .where("id", "=", staff.userId)
    .executeTakeFirst()
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
    const id = crypto.randomUUID()
    try {
      await event.locals.db
        .insertInto("posts")
        .values({
          id,
          ...input,
          tags: JSON.stringify(input.tags),
          body_html: htmlFor(input.body_md),
          status: publish ? "published" : "draft",
          published_at: publish
            ? (input.published_at ?? nowIso())
            : input.published_at,
          created_by: staff.userId,
          updated_by: staff.userId,
        })
        .execute()
    } catch (e) {
      if (isUniqueViolation(e))
        return fail(400, {
          errors: { slug: "Another post already uses this URL" },
          values,
        })
      console.error("post create failed", e instanceof Error ? e.message : e)
      return fail(500, { errors: { _: "Could not save post" }, values })
    }
    await audit(
      event,
      publish ? "post.published" : "post.created",
      { type: "post", id },
      { slug: input.slug },
    )
    redirect(303, `/admin/blog/${id}?saved=1`)
  },
}
