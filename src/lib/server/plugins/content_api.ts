import { error, json, type RequestEvent } from "@sveltejs/kit"
import { z } from "zod"
import {
  blocksOrMarkdown,
  blocksSchema,
  parseBlocks,
  publishProblems,
  type Block,
} from "$lib/blocks"
import { audit } from "../audit"
import { bumpCacheVersion } from "../cache"
import { bodyFrom } from "../cms/content"
import { RESERVED_SLUGS, SLUG_RE, slugify } from "../cms/pages"
import {
  parseFieldValues,
  readFieldValues,
  typeBy,
  type ContentType,
} from "../cms/types"
import type { Db } from "../db"
import { isUniqueViolation } from "../db/errors"
import { nowIso, parseStringList } from "../db/json"
import { importImage } from "../media"
import { mediaLibrary } from "../media_library"
import { emit } from "./events"
import type { Scope, TokenAuth } from "./tokens"

// REST API over the site's content, for apps, scripts and other sites. Reads of published content are
// open; drafts, writes and private data need a token with the matching scope.

type Kind = "page" | "post" | "entry"
const TABLE = {
  page: "cms_pages",
  post: "posts",
  entry: "content_entries",
} as const
const PER_PAGE_MAX = 100

const need = (auth: TokenAuth | null, scope: Scope) => {
  if (!auth) error(401, "This needs an API token")
  if (!auth.scopes.has(scope))
    error(403, `This token does not have the ${scope} scope`)
}

const paging = (url: URL) => {
  const limit = Math.min(
    PER_PAGE_MAX,
    Math.max(
      1,
      Number.parseInt(url.searchParams.get("limit") ?? "20", 10) || 20,
    ),
  )
  const page = Math.max(
    1,
    Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1,
  )
  return { limit, offset: (page - 1) * limit, page }
}

type Row = {
  id: string
  slug: string
  title: string
  excerpt: string | null
  status: string
  published_at: string | null
  updated_at: string
  body_html: string
  blocks_json: string | null
  body_md: string
  seo_title: string | null
  seo_description: string | null
  seo_noindex: number
  og_image_url: string | null
  tags?: string
  cover_image_url?: string | null
  author_name?: string | null
  fields_json?: string
}

const shape = (kind: Kind, r: Row, type?: ContentType) => ({
  id: r.id,
  kind,
  ...(type
    ? { type: type.slug, url: `/${type.url_prefix}/${r.slug}` }
    : { url: kind === "post" ? `/blog/${r.slug}` : `/${r.slug}` }),
  slug: r.slug,
  title: r.title,
  excerpt: r.excerpt,
  status: r.status,
  published_at: r.published_at,
  updated_at: r.updated_at,
  html: r.body_html,
  blocks: r.blocks_json
    ? parseBlocks(r.blocks_json)
    : r.body_md
      ? [{ type: "markdown", md: r.body_md }]
      : [],
  seo: {
    title: r.seo_title,
    description: r.seo_description,
    noindex: !!r.seo_noindex,
    image: r.og_image_url,
  },
  ...(kind === "post"
    ? {
        tags: parseStringList(r.tags ?? "[]"),
        cover_image_url: r.cover_image_url,
        author_name: r.author_name,
      }
    : {}),
  ...(kind === "entry"
    ? { fields: parseFieldValues(r.fields_json ?? "{}") }
    : {}),
})

const COLUMNS = [
  "id",
  "slug",
  "title",
  "excerpt",
  "status",
  "published_at",
  "updated_at",
  "body_html",
  "blocks_json",
  "body_md",
  "seo_title",
  "seo_description",
  "seo_noindex",
  "og_image_url",
] as const

const list = async (
  db: Db,
  kind: Kind,
  url: URL,
  drafts: boolean,
  type?: ContentType,
) => {
  const { limit, offset, page } = paging(url)
  const extra =
    kind === "post"
      ? (["tags", "cover_image_url", "author_name"] as const)
      : kind === "entry"
        ? (["fields_json"] as const)
        : ([] as const)
  const tag = url.searchParams.get("tag")
  const rows = await db
    .selectFrom(TABLE[kind] as "posts")
    .select([
      ...COLUMNS,
      ...(extra as readonly ("tags" | "cover_image_url" | "author_name")[]),
    ])
    .$if(!drafts, (q) =>
      q
        .where("status", "=", "published")
        .where((eb) =>
          eb.or([
            eb("published_at", "is", null),
            eb("published_at", "<=", nowIso()),
          ]),
        ),
    )
    .$if(!!type, (q) => q.where("type_id" as never, "=", type!.id as never))
    .$if(kind === "post" && !!tag, (q) =>
      q.where("tags", "like", `%"${(tag ?? "").replace(/[%_"\\]/g, "")}"%`),
    )
    .orderBy(
      kind === "page" ? "title" : "published_at",
      kind === "page" ? "asc" : "desc",
    )
    .limit(limit)
    .offset(offset)
    .execute()
  return {
    data: rows.map((r) => shape(kind, r as unknown as Row, type)),
    page,
    limit,
  }
}

const one = async (
  db: Db,
  kind: Kind,
  slug: string,
  drafts: boolean,
  type?: ContentType,
) => {
  const r = await db
    .selectFrom(TABLE[kind] as "posts")
    .selectAll()
    .where((eb) =>
      /^[0-9a-f-]{36}$/.test(slug)
        ? eb.or([eb("slug", "=", slug), eb("id", "=", slug)])
        : eb("slug", "=", slug),
    )
    .$if(!drafts, (q) =>
      q
        .where("status", "=", "published")
        .where((eb) =>
          eb.or([
            eb("published_at", "is", null),
            eb("published_at", "<=", nowIso()),
          ]),
        ),
    )
    .$if(!!type, (q) => q.where("type_id" as never, "=", type!.id as never))
    .executeTakeFirst()
  if (!r) error(404, "Not found")
  return { data: shape(kind, r as unknown as Row, type) }
}

const writeSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().toLowerCase().max(100).regex(SLUG_RE).optional(),
  excerpt: z.string().trim().max(500).nullable().optional(),
  blocks: blocksSchema.optional(),
  markdown: z.string().max(200_000).optional(),
  status: z.enum(["draft", "published"]).optional(),
  seo_title: z.string().trim().max(200).nullable().optional(),
  seo_description: z.string().trim().max(500).nullable().optional(),
  tags: z
    .array(
      z
        .string()
        .trim()
        .toLowerCase()
        .max(40)
        .regex(/^[a-z0-9][a-z0-9 -]*$/),
    )
    .max(10)
    .optional(),
  cover_image_url: z
    .string()
    .trim()
    .max(1000)
    .regex(/^(\/(?![/\\])[^\s\\]*|https:\/\/[^\s]+)$/)
    .nullable()
    .optional(),
  author_name: z.string().trim().max(120).nullable().optional(),
  published_at: z.string().datetime().nullable().optional(),
  fields: z
    .record(
      z.string(),
      z.union([z.string().max(20_000), z.number(), z.boolean(), z.null()]),
    )
    .optional(),
})

const write = async (
  event: RequestEvent,
  auth: TokenAuth,
  kind: Kind,
  id: string | null,
  type?: ContentType,
) => {
  const db = event.locals.db
  const isNew = !id
  const body = await event.request.json().catch(() => null)
  // A PATCH changes only the fields it sends; everything else stays as it is.
  const parsed = (isNew ? writeSchema : writeSchema.partial()).safeParse(body)
  if (!parsed.success)
    return json(
      { error: "Invalid body", issues: parsed.error.issues.slice(0, 10) },
      { status: 400 },
    )
  const input = parsed.data
  const existing = id
    ? await db
        .selectFrom(TABLE[kind] as "content_entries")
        .select([
          "id",
          "status",
          "published_at",
          "blocks_json",
          "body_md",
          "title",
          "slug",
        ])
        .$if(kind === "entry", (q) => q.select("fields_json"))
        .where("id", "=", id)
        .$if(!!type, (q) => q.where("type_id", "=", type!.id))
        .executeTakeFirst()
    : null
  if (id && !existing) error(404, "Not found")
  const title = input.title ?? existing?.title ?? ""
  const slug = input.slug ?? existing?.slug ?? slugify(title)
  if (!SLUG_RE.test(slug))
    return json({ error: "Invalid slug" }, { status: 400 })
  if (kind === "page" && RESERVED_SLUGS.has(slug))
    return json({ error: "This URL is reserved" }, { status: 400 })
  const newBlocks: Block[] | undefined =
    input.blocks ??
    (input.markdown !== undefined
      ? [{ type: "markdown", md: input.markdown }]
      : undefined)
  const blocks =
    newBlocks ??
    (existing ? blocksOrMarkdown(existing.blocks_json, existing.body_md) : [])
  const status =
    input.status ??
    (existing?.status as "draft" | "published" | undefined) ??
    "draft"
  if (status === "published") {
    const problems = publishProblems(blocks)
    if (problems.length)
      return json({ error: problems.join(". ") }, { status: 400 })
  }
  let fieldsJson: string | undefined
  if (kind === "entry" && type && (isNew || input.fields !== undefined)) {
    const merged = {
      ...(existing?.fields_json ? parseFieldValues(existing.fields_json) : {}),
      ...(input.fields ?? {}),
    }
    const fd = new FormData()
    for (const [k, v] of Object.entries(merged)) {
      if (v === true) fd.set(`field_${k}`, "on")
      else if (v !== null && v !== false && v !== undefined)
        fd.set(`field_${k}`, String(v))
    }
    const f = readFieldValues(type.fields, fd)
    if (Object.keys(f.errors).length)
      return json(
        { error: "Invalid fields", fields: f.errors },
        { status: 400 },
      )
    fieldsJson = JSON.stringify(f.values)
  }
  const now = nowIso()
  const set = <T>(v: T | undefined, fallback: T) =>
    v !== undefined ? v : isNew ? fallback : undefined
  const row = Object.fromEntries(
    Object.entries({
      slug,
      title,
      excerpt: set(input.excerpt, null),
      seo_title: set(input.seo_title, null),
      seo_description: set(input.seo_description, null),
      ...(isNew || newBlocks ? await bodyFrom(db, blocks) : {}),
      status,
      published_at:
        input.published_at ??
        existing?.published_at ??
        (status === "published" ? now : null),
      updated_at: now,
      ...(kind === "post"
        ? {
            tags:
              input.tags !== undefined
                ? JSON.stringify(input.tags)
                : isNew
                  ? "[]"
                  : undefined,
            cover_image_url: set(input.cover_image_url, null),
            author_name: set(input.author_name, null),
          }
        : {}),
      ...(fieldsJson !== undefined ? { fields_json: fieldsJson } : {}),
    }).filter(([, v]) => v !== undefined),
  )
  const newId = id ?? crypto.randomUUID()
  try {
    if (id)
      await db
        .updateTable(TABLE[kind] as "posts")
        .set(row as never)
        .where("id", "=", id)
        .execute()
    else
      await db
        .insertInto(TABLE[kind] as "posts")
        .values({
          id: newId,
          ...row,
          ...(type ? { type_id: type.id } : {}),
        } as never)
        .execute()
  } catch (e) {
    if (isUniqueViolation(e))
      return json(
        { error: "Another item already uses this slug" },
        { status: 409 },
      )
    throw e
  }
  await audit(
    event,
    `${kind}.${status === "published" ? "published" : "saved"}`,
    { type: kind, id: newId },
    { via: "api", token: auth.id },
  )
  if (status === "published" || existing?.status === "published") {
    await bumpCacheVersion(db)
    await emit(
      db,
      existing?.status === "published"
        ? "content.updated"
        : "content.published",
      {
        kind,
        id: newId,
        slug,
        title,
        ...(type ? { type: type.slug } : {}),
      },
    )
  }
  return json({ data: { id: newId, slug } }, { status: id ? 200 : 201 })
}

const remove = async (
  event: RequestEvent,
  auth: TokenAuth,
  kind: Kind,
  id: string,
  type?: ContentType,
) => {
  const db = event.locals.db
  const row = await db
    .selectFrom(TABLE[kind] as "posts")
    .select(["slug", "status"])
    .where("id", "=", id)
    .$if(!!type, (q) => q.where("type_id" as never, "=", type!.id as never))
    .executeTakeFirst()
  if (!row) error(404, "Not found")
  await db
    .deleteFrom(TABLE[kind] as "posts")
    .where("id", "=", id)
    .execute()
  await audit(
    event,
    `${kind}.deleted`,
    { type: kind, id },
    { via: "api", token: auth.id },
  )
  if (row.status === "published") {
    await bumpCacheVersion(db)
    await emit(db, "content.deleted", { kind, id, slug: row.slug })
  }
  return new Response(null, { status: 204 })
}

/** Routes one API request. `parts` is the path after /api/v1/. */
export const contentApi = async (
  event: RequestEvent,
  auth: TokenAuth | null,
  parts: string[],
) => {
  const db = event.locals.db
  const method = event.request.method
  const drafts =
    !!auth?.scopes.has("content:read") &&
    event.url.searchParams.get("status") === "all"
  const [head, a, b, c] = parts

  if (head === "pages" || head === "posts") {
    const kind: Kind = head === "pages" ? "page" : "post"
    if (method === "GET")
      return json(
        a
          ? await one(db, kind, a, drafts)
          : await list(db, kind, event.url, drafts),
      )
    need(auth, "content:write")
    if (method === "POST" && !a) return write(event, auth!, kind, null)
    if ((method === "PATCH" || method === "PUT") && a)
      return write(event, auth!, kind, a)
    if (method === "DELETE" && a) return remove(event, auth!, kind, a)
  }

  if (head === "types") {
    if (!a && method === "GET")
      return json({
        data: (
          await db
            .selectFrom("content_types")
            .select(["slug", "name", "singular", "url_prefix", "fields_json"])
            .orderBy("name")
            .execute()
        ).map((t) => ({
          slug: t.slug,
          name: t.name,
          singular: t.singular,
          url: `/${t.url_prefix}`,
          fields: JSON.parse(t.fields_json),
        })),
      })
    const type = a ? await typeBy(db, "slug", a) : null
    if (!type || b !== "entries") error(404, "Not found")
    if (method === "GET")
      return json(
        c
          ? await one(db, "entry", c, drafts, type)
          : await list(db, "entry", event.url, drafts, type),
      )
    need(auth, "content:write")
    if (method === "POST" && !c) return write(event, auth!, "entry", null, type)
    if ((method === "PATCH" || method === "PUT") && c)
      return write(event, auth!, "entry", c, type)
    if (method === "DELETE" && c) return remove(event, auth!, "entry", c, type)
  }

  if (head === "media") {
    if (method === "GET") {
      need(auth, "media:read")
      const { files } = await mediaLibrary(db)
      return json({
        data: files.map((f) => ({
          name: f.name,
          url: f.url,
          alt: f.alt,
          width: f.width,
          height: f.height,
        })),
      })
    }
    if (method === "POST") {
      need(auth, "media:write")
      const body = await event.request.json().catch(() => null)
      const url = typeof body?.url === "string" ? body.url : ""
      const r = await importImage(db, url)
      if ("error" in r) return json({ error: r.error }, { status: 400 })
      return json(
        { data: { name: r.name, url: `/media/${r.name}` } },
        { status: 201 },
      )
    }
  }

  if (head === "contacts" && method === "GET") {
    need(auth, "contacts:read")
    const { limit, offset } = paging(event.url)
    const rows = await db
      .selectFrom("contact_requests")
      .select([
        "id",
        "first_name",
        "last_name",
        "email",
        "phone",
        "company_name",
        "message_body",
        "topic",
        "status",
        "created_at",
      ])
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset(offset)
      .execute()
    return json({ data: rows })
  }

  if (head === "forms" && a && b === "submissions" && method === "GET") {
    need(auth, "forms:read")
    const { limit, offset } = paging(event.url)
    const rows = await db
      .selectFrom("form_submissions")
      .selectAll()
      .where("form_id", "=", a)
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset(offset)
      .execute()
    return json({ data: rows })
  }

  error(404, "Not found")
}
