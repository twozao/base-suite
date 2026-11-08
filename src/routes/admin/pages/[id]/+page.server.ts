import { error, fail } from "@sveltejs/kit"
import { blocksOrMarkdown } from "$lib/blocks"
import { isUuid } from "$lib/server/ids"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { accessFor, deleteContent, saveContent } from "$lib/server/cms/editor"
import { bodyFrom } from "$lib/server/cms/content"
import { bumpCacheVersion } from "$lib/server/cache"
import { nowIso } from "$lib/server/db/json"
import { audit } from "$lib/server/audit"
import type { Actions, PageServerLoad, RequestEvent } from "./$types"

const guard = async (event: RequestEvent) => {
  requireModule("cms")
  const staff = await requirePermission(event, "cms.write")
  if (!isUuid(event.params.id)) error(404, "Not found")
  return staff
}

const current = (event: RequestEvent) =>
  event.locals.db
    .selectFrom("cms_pages")
    .select(["created_by", "status"])
    .where("id", "=", event.params.id)
    .executeTakeFirst()

export const load: PageServerLoad = async (event) => {
  const staff = await guard(event)
  const db = event.locals.db
  const [page, revisions] = await Promise.all([
    db
      .selectFrom("cms_pages")
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
        "template",
        "status",
        "published_at",
        "review_requested_at",
        "review_note",
        "created_by",
        "updated_at",
      ])
      .where("id", "=", event.params.id)
      .executeTakeFirst(),
    db
      .selectFrom("cms_page_revisions")
      .select(["id", "title", "created_at", "saved_by"])
      .where("page_id", "=", event.params.id)
      .orderBy("created_at", "desc")
      .orderBy("id", "desc")
      .limit(20)
      .execute(),
  ])
  if (!page) error(404, "Page not found")
  const access = accessFor(staff, page)
  if (!access.canEdit && !staff.permissions.has("cms.edit"))
    error(403, "You can't edit this page")
  const { blocks_json, body_md, ...rest } = page
  return {
    page: rest,
    blocks: blocksOrMarkdown(blocks_json, body_md),
    revisions,
    access,
    saved: event.url.searchParams.has("saved"),
  }
}

export const actions: Actions = {
  save: (event) => saveContent(event, { kind: "page", id: event.params.id }),

  restore: async (event) => {
    const staff = await guard(event)
    const form = await event.request.formData()
    const revId = Number(form.get("revision"))
    if (!Number.isInteger(revId))
      return fail(400, { error: "Invalid revision" })
    const db = event.locals.db
    const page = await current(event)
    if (!page) error(404, "Not found")
    const access = accessFor(staff, page)
    if (!access.canEdit || (page.status === "published" && !access.canPublish))
      return fail(403, { error: "You can't change this page" })
    const rev = await db
      .selectFrom("cms_page_revisions")
      .select(["title", "body_md", "blocks_json"])
      .where("id", "=", revId)
      .where("page_id", "=", event.params.id)
      .executeTakeFirst()
    if (!rev) return fail(404, { error: "Revision not found" })
    // Restoring always produces a draft; publishing is a separate, deliberate step.
    const body = await bodyFrom(
      db,
      blocksOrMarkdown(rev.blocks_json, rev.body_md),
    )
    await db
      .updateTable("cms_pages")
      .set({
        title: rev.title,
        ...body,
        status: "draft",
        updated_by: staff.userId,
        updated_at: nowIso(),
      })
      .where("id", "=", event.params.id)
      .execute()
    if (page.status === "published") await bumpCacheVersion(db)
    await audit(
      event,
      "page.revision_restored",
      { type: "page", id: event.params.id },
      { revision: revId },
    )
    return { message: "Revision restored as a draft" }
  },

  archive: async (event) => {
    const staff = await guard(event)
    const page = await current(event)
    if (!page) error(404, "Not found")
    if (!accessFor(staff, page).canDelete)
      return fail(403, { error: "You can't archive this page" })
    await event.locals.db
      .updateTable("cms_pages")
      .set({ status: "archived", updated_at: nowIso() })
      .where("id", "=", event.params.id)
      .execute()
    await bumpCacheVersion(event.locals.db)
    await audit(event, "page.archived", { type: "page", id: event.params.id })
    return { message: "Archived" }
  },

  delete: async (event) => {
    await guard(event)
    return deleteContent(event, "page", event.params.id, "/admin/pages")
  },
}
