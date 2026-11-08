import { error } from "@sveltejs/kit"
import { blocksOrMarkdown } from "$lib/blocks"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { accessFor, deleteContent, saveContent } from "$lib/server/cms/editor"
import { isUuid } from "$lib/server/ids"
import { withTags } from "$lib/server/posts"
import type { Actions, PageServerLoad, RequestEvent } from "./$types"

const guard = async (event: RequestEvent) => {
  requireModule("cms")
  const staff = await requirePermission(event, "cms.write")
  if (!isUuid(event.params.id)) error(404, "Not found")
  return staff
}

export const load: PageServerLoad = async (event) => {
  const staff = await guard(event)
  const row = await event.locals.db
    .selectFrom("posts")
    .select([
      "id",
      "slug",
      "title",
      "body_md",
      "blocks_json",
      "excerpt",
      "seo_title",
      "seo_description",
      "og_image_url",
      "seo_noindex",
      "cover_image_url",
      "author_name",
      "tags",
      "status",
      "published_at",
      "review_requested_at",
      "review_note",
      "created_by",
      "updated_at",
    ])
    .where("id", "=", event.params.id)
    .executeTakeFirst()
  if (!row) error(404, "Post not found")
  const access = accessFor(staff, row)
  if (!access.canEdit) error(403, "You can't edit this post")
  const { blocks_json, body_md, ...rest } = row
  return {
    post: withTags(rest),
    blocks: blocksOrMarkdown(blocks_json, body_md),
    access,
    saved: event.url.searchParams.has("saved"),
  }
}

export const actions: Actions = {
  save: (event) => saveContent(event, { kind: "post", id: event.params.id }),
  delete: async (event) => {
    await guard(event)
    return deleteContent(event, "post", event.params.id, "/admin/blog")
  },
}
