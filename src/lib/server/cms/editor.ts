import { error, fail, redirect, type RequestEvent } from "@sveltejs/kit"
import { z } from "zod"
import { publishProblems, type Block } from "$lib/blocks"
import type { Permission } from "$lib/permissions"
import { audit } from "../audit"
import { requireModule, requirePermission } from "../auth/staff"
import { bumpCacheVersion } from "../cache"
import type { Db } from "../db"
import { isUniqueViolation } from "../db/errors"
import { nowIso } from "../db/json"
import { emit } from "../plugins/events"
import { background } from "../platform"
import { sendAdminEmail } from "$lib/mailer"
import { imageUrl } from "../content_schema"
import { bodyFrom, readBlocksField } from "./content"
import { RESERVED_SLUGS, SLUG_RE, slugify } from "./pages"
import { readFieldValues, typeBy, type ContentType } from "./types"

// One save path for pages, blog posts and content-type entries: validation, blocks, who may publish,
// review requests, revisions, audit, webhooks and the page cache all live here.

export type Kind = "page" | "post" | "entry"
const TABLE = {
  page: "cms_pages",
  post: "posts",
  entry: "content_entries",
} as const
const NOUN = { page: "page", post: "post", entry: "entry" } as const

type Staff = { userId: string; permissions: ReadonlySet<Permission> }

/** Who may edit and publish one item. Editors handle everything; authors their own; contributors only drafts. */
export const accessFor = (
  staff: Staff,
  item: { created_by: string | null; status: string } | null,
) => {
  const has = (p: Permission) => staff.permissions.has(p)
  const own = !item || item.created_by === staff.userId
  const canPublish = has("cms.publish") || (has("cms.publish_own") && own)
  const canEdit =
    has("cms.edit") ||
    (has("cms.write") && own && (item?.status !== "published" || canPublish))
  return {
    canEdit,
    canPublish,
    canDelete: has("cms.publish") || (canPublish && own),
  }
}

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))

const commonSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(100)
    .regex(SLUG_RE, "Use lowercase letters, numbers and dashes"),
  excerpt: optional(500),
  seo_title: optional(200),
  seo_description: optional(500),
  og_image_url: imageUrl.transform((v) => (v === "" ? null : v)),
  seo_noindex: z.boolean(),
  review_note: optional(1000),
})

const tagList = z
  .string()
  .max(400)
  .transform((v) =>
    [
      ...new Set(
        v
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
      ),
    ].slice(0, 10),
  )
  .pipe(
    z.array(
      z
        .string()
        .max(40)
        .regex(
          /^[a-z0-9][a-z0-9 -]*$/,
          "Tags: letters, numbers, spaces and dashes",
        ),
    ),
  )

const postSchema = z.object({
  cover_image_url: imageUrl.transform((v) => (v === "" ? null : v)),
  author_name: optional(120),
  tags: tagList,
  published_at: z
    .string()
    .trim()
    .max(40)
    .transform((v, ctx) => {
      if (!v) return null
      const d = new Date(v)
      if (Number.isNaN(d.getTime())) {
        ctx.addIssue({ code: "custom", message: "Invalid date" })
        return z.NEVER
      }
      return d.toISOString()
    }),
})

const pageSchema = z.object({
  template: z.enum(["default", "wide", "landing"]),
})

type Intent = "draft" | "publish" | "review"

/** Everything the editor form posted, kept as strings so a failed save can show the form again. */
const readForm = (form: FormData) => {
  const s = (k: string) => String(form.get(k) ?? "")
  const title = s("title")
  return {
    title,
    slug: s("slug") || slugify(title),
    excerpt: s("excerpt"),
    seo_title: s("seo_title"),
    seo_description: s("seo_description"),
    og_image_url: s("og_image_url"),
    seo_noindex: form.get("seo_noindex") ? "1" : "",
    review_note: s("review_note"),
    template: s("template") || "default",
    cover_image_url: s("cover_image_url"),
    author_name: s("author_name"),
    tags: s("tags"),
    published_at: s("published_at"),
    sort_order: s("sort_order"),
    blocks: s("blocks"),
  }
}
export type EditorValues = ReturnType<typeof readForm> & {
  fields?: Record<string, string>
}

const issuesToErrors = (
  issues: readonly { path: readonly PropertyKey[]; message: string }[],
  into: Record<string, string>,
) => {
  for (const i of issues) into[String(i.path[0] ?? "_")] ??= i.message
}

type SaveTarget =
  | { kind: "page" | "post"; id: string | null }
  | { kind: "entry"; id: string | null; type: ContentType }

/** Handles the editor form for create (id null) and update. Returns a form result or redirects. */
export const saveContent = async (event: RequestEvent, target: SaveTarget) => {
  requireModule("cms")
  const staff = await requirePermission(event, "cms.write")
  const db = event.locals.db
  const form = await event.request.formData()
  const values: EditorValues = readForm(form)
  const intentRaw = String(form.get("intent") ?? "draft")
  const intent: Intent =
    intentRaw === "publish" || intentRaw === "review" ? intentRaw : "draft"
  const errors: Record<string, string> = {}
  const table = TABLE[target.kind]
  const noun =
    target.kind === "entry"
      ? target.type.singular.toLowerCase()
      : NOUN[target.kind]

  const common = commonSchema.safeParse({
    ...values,
    seo_noindex: !!values.seo_noindex,
  })
  if (!common.success) issuesToErrors(common.error.issues, errors)
  if (target.kind === "page" && RESERVED_SLUGS.has(values.slug))
    errors.slug = "This URL is reserved"
  const post = target.kind === "post" ? postSchema.safeParse(values) : null
  if (post && !post.success) issuesToErrors(post.error.issues, errors)
  const page = target.kind === "page" ? pageSchema.safeParse(values) : null
  if (page && !page.success) errors.template = "Pick a layout"
  const fields =
    target.kind === "entry" ? readFieldValues(target.type.fields, form) : null
  if (fields) {
    Object.assign(errors, fields.errors)
    values.fields = fields.raw
  }
  const blocksRead = readBlocksField(form.get("blocks"))
  if ("error" in blocksRead) errors.blocks = blocksRead.error
  const blocks: Block[] = "blocks" in blocksRead ? blocksRead.blocks : []
  if (Object.keys(errors).length || !common.success)
    return fail(400, { errors, values })

  const existing = target.id
    ? await db
        .selectFrom(table)
        .select(["created_by", "status", "published_at"])
        .where("id", "=", target.id)
        .$if(target.kind === "entry", (q) =>
          q.where(
            "type_id" as never,
            "=",
            (target as { type: ContentType }).type.id as never,
          ),
        )
        .executeTakeFirst()
    : null
  if (target.id && !existing) error(404, "Not found")
  const access = accessFor(staff, existing ?? null)
  if (!access.canEdit)
    return fail(403, { errors: { _: `You can't change this ${noun}` }, values })
  if (intent === "publish" && !access.canPublish)
    return fail(403, {
      errors: {
        _: `You can't publish this ${noun}. Send it for review instead.`,
      },
      values,
    })
  if (
    intent !== "publish" &&
    existing?.status === "published" &&
    !access.canPublish
  )
    return fail(403, {
      errors: { _: `You can't unpublish this ${noun}` },
      values,
    })
  if (intent === "publish") {
    const problems = publishProblems(blocks)
    if (problems.length)
      return fail(400, { errors: { blocks: problems.join(". ") }, values })
  }
  if (
    target.kind === "page" &&
    (await db
      .selectFrom("content_types")
      .select("id")
      .where("url_prefix", "=", common.data.slug)
      .executeTakeFirst())
  )
    return fail(400, {
      errors: { slug: "A content type uses this URL" },
      values,
    })

  const now = nowIso()
  const body = await bodyFrom(db, blocks)
  const { review_note, ...commonData } = common.data
  const publishedAt =
    post?.success && post.data.published_at
      ? post.data.published_at
      : (existing?.published_at ?? (intent === "publish" ? now : null))
  const row = {
    ...commonData,
    seo_noindex: commonData.seo_noindex ? 1 : 0,
    ...body,
    status: intent === "publish" ? ("published" as const) : ("draft" as const),
    published_at: publishedAt,
    review_requested_at: intent === "review" ? now : null,
    review_note: intent === "review" ? review_note : null,
    updated_by: staff.userId,
    updated_at: now,
    ...(page?.success ? { template: page.data.template } : {}),
    ...(post?.success
      ? {
          ...post.data,
          tags: JSON.stringify(post.data.tags),
          published_at: publishedAt,
        }
      : {}),
    ...(fields
      ? {
          fields_json: JSON.stringify(fields.values),
          sort_order: Number.parseInt(values.sort_order, 10) || 0,
        }
      : {}),
  }

  const id = target.id ?? crypto.randomUUID()
  try {
    if (target.id) {
      await db
        .updateTable(table)
        .set(row as never)
        .where("id", "=", id)
        .execute()
    } else {
      await db
        .insertInto(table)
        .values({
          id,
          ...row,
          created_by: staff.userId,
          ...(target.kind === "entry" ? { type_id: target.type.id } : {}),
        } as never)
        .execute()
    }
    if (target.kind === "page") {
      await db
        .insertInto("cms_page_revisions")
        .values({
          page_id: id,
          title: row.title,
          body_md: row.body_md,
          blocks_json: row.blocks_json,
          saved_by: staff.userId,
        })
        .execute()
    }
  } catch (e) {
    if (isUniqueViolation(e))
      return fail(400, {
        errors: { slug: `Another ${noun} already uses this URL` },
        values,
      })
    console.error(`${noun} save failed`, e instanceof Error ? e.message : e)
    return fail(500, { errors: { _: `Could not save the ${noun}` }, values })
  }

  const auditType = target.kind === "entry" ? "entry" : target.kind
  const action =
    intent === "publish"
      ? "published"
      : intent === "review"
        ? "review_requested"
        : target.id
          ? "saved"
          : "created"
  await audit(
    event,
    `${auditType}.${action}`,
    { type: auditType, id },
    { slug: row.slug },
  )
  if (intent === "review")
    background(
      sendAdminEmail({
        db: event.locals.db,
        subject: `Ready for review: ${row.title}`,
        body: `A ${noun} was sent for review${review_note ? ` with this note: ${review_note}` : ""}.\n\n${event.url.origin}/admin/review`,
      }),
    )
  if (intent === "publish" || existing?.status === "published") {
    await bumpCacheVersion(db)
    await emit(
      db,
      existing?.status === "published"
        ? "content.updated"
        : "content.published",
      {
        kind: target.kind,
        id,
        slug: row.slug,
        title: row.title,
        ...(target.kind === "entry" ? { type: target.type.slug } : {}),
      },
    )
  }
  if (!target.id) {
    const base =
      target.kind === "entry"
        ? `/admin/content/${target.type.slug}`
        : target.kind === "page"
          ? "/admin/pages"
          : "/admin/blog"
    redirect(303, `${base}/${id}?saved=1`)
  }
  return {
    message:
      intent === "publish"
        ? "Published"
        : intent === "review"
          ? "Sent for review"
          : "Saved as draft",
  }
}

/** Deletes one item after the slug was typed to confirm. */
export const deleteContent = async (
  event: RequestEvent,
  kind: Kind,
  id: string,
  back: string,
  typeId?: string,
) => {
  requireModule("cms")
  const staff = await requirePermission(event, "cms.write")
  const db = event.locals.db
  const table = TABLE[kind]
  const form = await event.request.formData()
  const item = await db
    .selectFrom(table)
    .select(["slug", "created_by", "status"])
    .where("id", "=", id)
    .$if(!!typeId, (q) => q.where("type_id" as never, "=", typeId as never))
    .executeTakeFirst()
  if (!item) error(404, "Not found")
  if (!accessFor(staff, item).canDelete)
    return fail(403, { error: `You can't delete this ${NOUN[kind]}` })
  if (form.get("confirm") !== item.slug)
    return fail(400, { error: "Type the URL to confirm deletion" })
  await db.deleteFrom(table).where("id", "=", id).execute()
  await audit(event, `${kind}.deleted`, { type: kind, id }, { slug: item.slug })
  if (item.status === "published") {
    await bumpCacheVersion(db)
    await emit(db, "content.deleted", { kind, id, slug: item.slug })
  }
  redirect(303, back)
}

/** The content type in the URL, or a 404. */
export const typeFromParams = async (db: Db, slug: string) => {
  const t = await typeBy(db, "slug", slug)
  if (!t) error(404, "Content type not found")
  return t
}
