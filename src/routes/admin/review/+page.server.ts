import { fail } from "@sveltejs/kit"
import { z } from "zod"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { audit } from "$lib/server/audit"
import { nowIso } from "$lib/server/db/json"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  requireModule("cms")
  await requirePermission(event, "cms.publish")
  const db = event.locals.db
  const cols = [
    "id",
    "title",
    "slug",
    "review_requested_at",
    "review_note",
    "created_by",
  ] as const
  const [pages, posts, entries] = await Promise.all([
    db
      .selectFrom("cms_pages")
      .select(cols)
      .where("review_requested_at", "is not", null)
      .where("status", "!=", "published")
      .execute(),
    db
      .selectFrom("posts")
      .select(cols)
      .where("review_requested_at", "is not", null)
      .where("status", "!=", "published")
      .execute(),
    db
      .selectFrom("content_entries as e")
      .innerJoin("content_types as t", "t.id", "e.type_id")
      .select([
        "e.id",
        "e.title",
        "e.slug",
        "e.review_requested_at",
        "e.review_note",
        "e.created_by",
        "t.slug as type",
        "t.singular",
      ])
      .where("e.review_requested_at", "is not", null)
      .where("e.status", "!=", "published")
      .execute(),
  ])
  const authors = await db.selectFrom("users").select(["id", "email"]).execute()
  const who = (id: string | null) =>
    authors.find((a) => a.id === id)?.email ?? "Unknown"
  const items = [
    ...pages.map((p) => ({
      ...p,
      kind: "page",
      label: "Page",
      edit: `/admin/pages/${p.id}`,
      by: who(p.created_by),
    })),
    ...posts.map((p) => ({
      ...p,
      kind: "post",
      label: "Post",
      edit: `/admin/blog/${p.id}`,
      by: who(p.created_by),
    })),
    ...entries.map((e) => ({
      ...e,
      kind: "entry",
      label: e.singular,
      edit: `/admin/content/${e.type}/${e.id}`,
      by: who(e.created_by),
    })),
  ].sort((a, b) =>
    String(a.review_requested_at).localeCompare(String(b.review_requested_at)),
  )
  return { items }
}

const TABLES = {
  page: "cms_pages",
  post: "posts",
  entry: "content_entries",
} as const

export const actions: Actions = {
  // Sends the draft back to its writer with a note; it stays a draft.
  sendBack: async (event) => {
    await requirePermission(event, "cms.publish")
    const form = await event.request.formData()
    const parsed = z
      .object({
        kind: z.enum(["page", "post", "entry"]),
        id: z.string().uuid(),
        note: z.string().trim().max(900),
      })
      .safeParse(Object.fromEntries(form))
    if (!parsed.success) return fail(400, { error: "Invalid request" })
    const { kind, id, note } = parsed.data
    await event.locals.db
      .updateTable(TABLES[kind])
      .set({
        review_requested_at: null,
        review_note: note ? `Editor: ${note}` : null,
        updated_at: nowIso(),
      })
      .where("id", "=", id)
      .execute()
    await audit(
      event,
      `${kind}.saved`,
      { type: kind, id },
      { review: "sent back" },
    )
    return { message: "Sent back to the writer" }
  },
}
