import { error, fail, redirect } from "@sveltejs/kit"
import { isUuid } from "$lib/server/ids"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { htmlFor, parsePageForm } from "$lib/server/cms/admin"
import { isUniqueViolation } from "$lib/server/db/errors"
import { nowIso } from "$lib/server/db/json"
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
  const db = event.locals.db
  const [page, revisions] = await Promise.all([
    db
      .selectFrom("cms_pages")
      .select([
        "id",
        "slug",
        "title",
        "body_md",
        "excerpt",
        "seo_title",
        "seo_description",
        "status",
        "published_at",
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
  return {
    page,
    revisions,
    canPublish: staff.permissions.has("cms.publish"),
    saved: event.url.searchParams.has("saved"),
  }
}

export const actions: Actions = {
  save: async (event) => {
    const staff = await guard(event)
    const result = await parsePageForm(event)
    if ("failure" in result) return result.failure
    const { input, values, publish } = result
    if (publish && !staff.permissions.has("cms.publish")) {
      return fail(403, { errors: { _: "You can't publish pages" }, values })
    }
    const db = event.locals.db
    const existing = await db
      .selectFrom("cms_pages")
      .select(["status", "published_at"])
      .where("id", "=", event.params.id)
      .executeTakeFirst()
    if (!existing) error(404, "Not found")
    // Editors without publish rights can't take a live page down either.
    if (
      !publish &&
      existing.status === "published" &&
      !staff.permissions.has("cms.publish")
    ) {
      return fail(403, { errors: { _: "You can't unpublish pages" }, values })
    }
    const now = nowIso()
    try {
      // The page update and its revision land together or not at all.
      await db.transaction().execute(async (trx) => {
        await trx
          .updateTable("cms_pages")
          .set({
            ...input,
            body_html: htmlFor(input.body_md),
            status: publish ? "published" : "draft",
            published_at: publish
              ? (existing.published_at ?? now)
              : existing.published_at,
            updated_by: staff.userId,
            updated_at: now,
          })
          .where("id", "=", event.params.id)
          .execute()
        await trx
          .insertInto("cms_page_revisions")
          .values({
            page_id: event.params.id,
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
      console.error("page save failed", e instanceof Error ? e.message : e)
      return fail(500, { errors: { _: "Could not save page" }, values })
    }
    await audit(
      event,
      publish ? "page.published" : "page.saved",
      { type: "page", id: event.params.id },
      { slug: input.slug },
    )
    return { message: publish ? "Published" : "Saved as draft" }
  },

  restore: async (event) => {
    const staff = await guard(event)
    const form = await event.request.formData()
    const revId = Number(form.get("revision"))
    if (!Number.isInteger(revId))
      return fail(400, { error: "Invalid revision" })
    const db = event.locals.db
    const rev = await db
      .selectFrom("cms_page_revisions")
      .select(["title", "body_md"])
      .where("id", "=", revId)
      .where("page_id", "=", event.params.id)
      .executeTakeFirst()
    if (!rev) return fail(404, { error: "Revision not found" })
    // Restoring always produces a draft; publishing is a separate, deliberate step.
    const page = await db
      .selectFrom("cms_pages")
      .select("status")
      .where("id", "=", event.params.id)
      .executeTakeFirst()
    if (page?.status === "published" && !staff.permissions.has("cms.publish")) {
      return fail(403, { error: "You can't change a published page" })
    }
    await db
      .updateTable("cms_pages")
      .set({
        title: rev.title,
        body_md: rev.body_md,
        body_html: htmlFor(rev.body_md),
        status: "draft",
        updated_by: staff.userId,
        updated_at: nowIso(),
      })
      .where("id", "=", event.params.id)
      .execute()
    await audit(
      event,
      "page.revision_restored",
      { type: "page", id: event.params.id },
      { revision: revId },
    )
    return { message: "Revision restored as a draft" }
  },

  archive: async (event) => {
    await guard(event, "cms.publish")
    await event.locals.db
      .updateTable("cms_pages")
      .set({ status: "archived", updated_at: nowIso() })
      .where("id", "=", event.params.id)
      .execute()
    await audit(event, "page.archived", { type: "page", id: event.params.id })
    return { message: "Archived" }
  },

  delete: async (event) => {
    await guard(event, "cms.publish")
    const form = await event.request.formData()
    const db = event.locals.db
    const page = await db
      .selectFrom("cms_pages")
      .select("slug")
      .where("id", "=", event.params.id)
      .executeTakeFirst()
    if (!page) error(404, "Not found")
    if (form.get("confirm") !== page.slug)
      return fail(400, { error: "Type the page URL to confirm deletion" })
    await db.deleteFrom("cms_pages").where("id", "=", event.params.id).execute()
    await audit(
      event,
      "page.deleted",
      { type: "page", id: event.params.id },
      { slug: page.slug },
    )
    redirect(303, "/admin/pages")
  },
}
