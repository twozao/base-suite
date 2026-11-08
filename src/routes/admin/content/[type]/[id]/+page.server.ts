import { error } from "@sveltejs/kit"
import { blocksOrMarkdown } from "$lib/blocks"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import {
  accessFor,
  deleteContent,
  saveContent,
  typeFromParams,
} from "$lib/server/cms/editor"
import { fieldStrings, relationOptions } from "$lib/server/cms/entries_admin"
import { parseFieldValues } from "$lib/server/cms/types"
import { isUuid } from "$lib/server/ids"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  requireModule("cms")
  const staff = await requirePermission(event, "cms.write")
  if (!isUuid(event.params.id)) error(404, "Not found")
  const db = event.locals.db
  const type = await typeFromParams(db, event.params.type)
  const row = await db
    .selectFrom("content_entries")
    .select([
      "id",
      "slug",
      "title",
      "body_md",
      "blocks_json",
      "fields_json",
      "excerpt",
      "seo_title",
      "seo_description",
      "og_image_url",
      "seo_noindex",
      "sort_order",
      "status",
      "published_at",
      "review_requested_at",
      "review_note",
      "created_by",
      "updated_at",
    ])
    .where("id", "=", event.params.id)
    .where("type_id", "=", type.id)
    .executeTakeFirst()
  if (!row) error(404, "Entry not found")
  const access = accessFor(staff, row)
  if (!access.canEdit) error(403, "You can't edit this entry")
  const { blocks_json, body_md, fields_json, ...entry } = row
  return {
    type,
    entry,
    fields: fieldStrings(parseFieldValues(fields_json)),
    blocks: blocksOrMarkdown(blocks_json, body_md),
    relations: await relationOptions(db, type),
    access,
    saved: event.url.searchParams.has("saved"),
  }
}

export const actions: Actions = {
  save: async (event) => {
    if (!isUuid(event.params.id)) error(404, "Not found")
    const type = await typeFromParams(event.locals.db, event.params.type)
    return saveContent(event, { kind: "entry", id: event.params.id, type })
  },
  delete: async (event) => {
    if (!isUuid(event.params.id)) error(404, "Not found")
    const type = await typeFromParams(event.locals.db, event.params.type)
    return deleteContent(
      event,
      "entry",
      event.params.id,
      `/admin/content/${type.slug}`,
      type.id,
    )
  },
}
