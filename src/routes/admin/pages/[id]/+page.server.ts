import { error, fail, redirect } from "@sveltejs/kit"
import { isUuid } from "$lib/server/ids"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { htmlFor, parsePageForm } from "$lib/server/cms/admin"
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
  const db = event.locals.supabaseServiceRole
  const [{ data: page }, { data: revisions }] = await Promise.all([
    db
      .from("cms_pages")
      .select(
        "id, slug, title, body_md, excerpt, seo_title, seo_description, status, published_at, updated_at",
      )
      .eq("id", event.params.id)
      .maybeSingle(),
    db
      .from("cms_page_revisions")
      .select("id, title, created_at, saved_by")
      .eq("page_id", event.params.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ])
  if (!page) error(404, "Page not found")
  return {
    page,
    revisions: revisions ?? [],
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
    const db = event.locals.supabaseServiceRole
    const { data: existing } = await db
      .from("cms_pages")
      .select("status, published_at")
      .eq("id", event.params.id)
      .maybeSingle()
    if (!existing) error(404, "Not found")
    // Editors without publish rights can't take a live page down either.
    if (
      !publish &&
      existing.status === "published" &&
      !staff.permissions.has("cms.publish")
    ) {
      return fail(403, { errors: { _: "You can't unpublish pages" }, values })
    }
    const now = new Date().toISOString()
    const { error: e } = await db
      .from("cms_pages")
      .update({
        ...input,
        body_html: htmlFor(input.body_md),
        status: publish ? "published" : "draft",
        published_at: publish
          ? (existing.published_at ?? now)
          : existing.published_at,
        updated_by: staff.userId,
        updated_at: now,
      })
      .eq("id", event.params.id)
    if (e) {
      if (e.code === "23505")
        return fail(400, {
          errors: { slug: "Another page already uses this URL" },
          values,
        })
      return fail(500, { errors: { _: "Could not save page" }, values })
    }
    await db.from("cms_page_revisions").insert({
      page_id: event.params.id,
      title: input.title,
      body_md: input.body_md,
      saved_by: staff.userId,
    })
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
    const db = event.locals.supabaseServiceRole
    const { data: rev } = await db
      .from("cms_page_revisions")
      .select("title, body_md")
      .eq("id", revId)
      .eq("page_id", event.params.id)
      .maybeSingle()
    if (!rev) return fail(404, { error: "Revision not found" })
    // Restoring always produces a draft; publishing is a separate, deliberate step.
    const { data: page } = await db
      .from("cms_pages")
      .select("status")
      .eq("id", event.params.id)
      .maybeSingle()
    if (page?.status === "published" && !staff.permissions.has("cms.publish")) {
      return fail(403, { error: "You can't change a published page" })
    }
    await db
      .from("cms_pages")
      .update({
        title: rev.title,
        body_md: rev.body_md,
        body_html: htmlFor(rev.body_md),
        status: "draft",
        updated_by: staff.userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", event.params.id)
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
    await event.locals.supabaseServiceRole
      .from("cms_pages")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", event.params.id)
    await audit(event, "page.archived", { type: "page", id: event.params.id })
    return { message: "Archived" }
  },

  delete: async (event) => {
    await guard(event, "cms.publish")
    const form = await event.request.formData()
    const db = event.locals.supabaseServiceRole
    const { data: page } = await db
      .from("cms_pages")
      .select("slug")
      .eq("id", event.params.id)
      .maybeSingle()
    if (!page) error(404, "Not found")
    if (form.get("confirm") !== page.slug)
      return fail(400, { error: "Type the page URL to confirm deletion" })
    await db.from("cms_pages").delete().eq("id", event.params.id)
    await audit(
      event,
      "page.deleted",
      { type: "page", id: event.params.id },
      { slug: page.slug },
    )
    redirect(303, "/admin/pages")
  },
}
