import { XMLParser } from "fast-xml-parser"
import { parseBlocks, type Block } from "$lib/blocks"
import type { Db } from "../db"
import { nowIso } from "../db/json"
import { bodyFrom } from "./content"
import { RESERVED_SLUGS, SLUG_RE, slugify } from "./pages"

// Imports a WordPress export file (Tools > Export, WXR): posts, pages, custom post types, categories and
// tags, authors, featured images, SEO titles and descriptions. Old addresses become redirects.

const SKIP_TYPES = new Set([
  "attachment",
  "revision",
  "nav_menu_item",
  "wp_block",
  "wp_template",
  "wp_template_part",
  "wp_global_styles",
  "wp_navigation",
  "custom_css",
  "customize_changeset",
  "oembed_cache",
  "user_request",
  "wp_font_family",
  "wp_font_face",
])

export const MAX_IMPORT_BYTES = 20 * 1024 * 1024
const MAX_ITEMS = 3000

type Meta = { "wp:meta_key"?: unknown; "wp:meta_value"?: unknown }
type Cat = { "@_domain"?: string; "@_nicename"?: string; "#text"?: unknown }
type Item = {
  title?: unknown
  link?: unknown
  "dc:creator"?: unknown
  "content:encoded"?: unknown
  "excerpt:encoded"?: unknown
  "wp:post_id"?: unknown
  "wp:post_date_gmt"?: unknown
  "wp:post_date"?: unknown
  "wp:post_name"?: unknown
  "wp:status"?: unknown
  "wp:post_type"?: unknown
  "wp:attachment_url"?: unknown
  category?: Cat[]
  "wp:postmeta"?: Meta[]
}

const str = (v: unknown): string =>
  v === undefined || v === null
    ? ""
    : typeof v === "object"
      ? String((v as { "#text"?: unknown })["#text"] ?? "")
      : String(v)

export type ParsedWxr = {
  origin: string
  siteTitle: string
  authors: Map<string, string>
  items: Item[]
}

/** Parses the export. Refuses files with a DOCTYPE, which WordPress never writes and entity tricks need. */
export const parseWxr = (xml: string): ParsedWxr | { error: string } => {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml.slice(0, 5000)) || /<!ENTITY/i.test(xml))
    return { error: "This file has a DOCTYPE, so it is not a WordPress export" }
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseTagValue: false,
    processEntities: true,
    htmlEntities: true,
    isArray: (name) =>
      ["item", "category", "wp:postmeta", "wp:author"].includes(name),
  })
  let doc: { rss?: { channel?: Record<string, unknown> } }
  try {
    doc = parser.parse(xml)
  } catch {
    return { error: "The file is not valid XML" }
  }
  const channel = doc.rss?.channel
  if (!channel || !("wp:wxr_version" in channel))
    return { error: "This is not a WordPress export file (WXR)" }
  const authors = new Map<string, string>()
  for (const a of (channel["wp:author"] as
    | Record<string, unknown>[]
    | undefined) ?? []) {
    const login = str(a["wp:author_login"])
    if (login) authors.set(login, str(a["wp:author_display_name"]) || login)
  }
  const origin = str(channel["wp:base_site_url"]) || str(channel.link)
  return {
    origin: origin.replace(/\/+$/, ""),
    siteTitle: str(channel.title),
    authors,
    items: ((channel.item as Item[] | undefined) ?? []).slice(0, MAX_ITEMS),
  }
}

/** WordPress content to clean HTML: block comments and shortcodes removed, bare paragraphs wrapped. */
export const wpContentToHtml = (raw: string): string => {
  let html = raw
    .replace(/<!--\s*\/?wp:[\s\S]*?-->/g, "")
    .replace(/\[caption[^\]]*\]([\s\S]*?)\[\/caption\]/g, "<figure>$1</figure>")
    .replace(/\[\/?[a-z][a-z0-9_-]*(?:\s[^\]]*)?\]/gi, "")
    .replace(/\r\n/g, "\n")
    .trim()
  // The classic editor stores paragraphs as blank lines (WordPress adds <p> when it shows them).
  if (!/<(p|div|h[1-6]|ul|ol|figure|blockquote|table|pre)\b/i.test(html)) {
    html = html
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
      .join("\n")
  }
  return html
}

const plain = (html: string, max: number) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)

const meta = (item: Item, key: string) =>
  str(
    (item["wp:postmeta"] ?? []).find((m) => str(m["wp:meta_key"]) === key)?.[
      "wp:meta_value"
    ],
  )

const wpDate = (item: Item) => {
  const gmt = str(item["wp:post_date_gmt"])
  const d =
    gmt && !gmt.startsWith("0000")
      ? new Date(gmt.replace(" ", "T") + "Z")
      : new Date(str(item["wp:post_date"]).replace(" ", "T"))
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

const tagOf = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 -]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40)

const pathOf = (link: string) => {
  try {
    const u = new URL(link)
    // Plain permalinks (/?p=12, /?portfolio=name) live in the query string.
    return (
      u.pathname +
      (u.search && (u.pathname === "/" || /[?&](p|page_id)=/.test(u.search))
        ? u.search
        : "")
    )
  } catch {
    return ""
  }
}

const titleCase = (s: string) =>
  s
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()

export type ImportCounts = {
  posts: number
  pages: number
  entries: number
  types: number
  skipped: number
  redirects: number
}

/** Writes the parsed export into the site. Items whose address is already taken are skipped. */
export const importWxr = async (
  db: Db,
  wxr: ParsedWxr,
  userId: string | null,
): Promise<ImportCounts> => {
  const counts: ImportCounts = {
    posts: 0,
    pages: 0,
    entries: 0,
    types: 0,
    skipped: 0,
    redirects: 0,
  }
  const attachments = new Map<string, string>()
  for (const it of wxr.items) {
    if (str(it["wp:post_type"]) === "attachment")
      attachments.set(str(it["wp:post_id"]), str(it["wp:attachment_url"]))
  }
  const typeIds = new Map<string, string>()
  const redirects: { from: string; to: string }[] = []

  for (const it of wxr.items) {
    const postType = str(it["wp:post_type"])
    if (!postType || SKIP_TYPES.has(postType)) continue
    const wpStatus = str(it["wp:status"])
    if (
      wpStatus === "trash" ||
      wpStatus === "auto-draft" ||
      wpStatus === "inherit"
    )
      continue
    const title = plain(str(it.title), 200) || "Untitled"
    let slug =
      slugify(decodeURIComponent(str(it["wp:post_name"]) || "")) ||
      slugify(title)
    if (!slug || !SLUG_RE.test(slug))
      slug = `item-${str(it["wp:post_id"]) || crypto.randomUUID().slice(0, 8)}`
    const html = wpContentToHtml(str(it["content:encoded"]))
    const blocks: Block[] = html ? [{ type: "html", html }] : []
    const body = await bodyFrom(db, blocks)
    const date = wpDate(it)
    const live = wpStatus === "publish" || wpStatus === "future"
    const excerpt = plain(str(it["excerpt:encoded"]), 500) || null
    const seoTitle =
      (meta(it, "_yoast_wpseo_title") || meta(it, "rank_math_title"))
        .replace(/%%[a-z_]+%%/g, "")
        .trim()
        .slice(0, 200) || null
    const seoDesc =
      (meta(it, "_yoast_wpseo_metadesc") || meta(it, "rank_math_description"))
        .trim()
        .slice(0, 500) || null
    const thumb = attachments.get(meta(it, "_thumbnail_id")) || null
    const common = {
      title,
      excerpt,
      seo_title: seoTitle,
      seo_description: seoDesc,
      ...body,
      status: live ? ("published" as const) : ("draft" as const),
      published_at: live ? date : null,
      created_by: userId,
      updated_by: userId,
    }
    let newPath = ""
    if (postType === "post") {
      const taken = await db
        .selectFrom("posts")
        .select("id")
        .where("slug", "=", slug)
        .executeTakeFirst()
      if (taken) {
        counts.skipped++
        continue
      }
      const tags = [
        ...new Set(
          (it.category ?? [])
            .map((c) => tagOf(str(c["#text"]) || str(c["@_nicename"])))
            .filter((t) => t && /^[a-z0-9][a-z0-9 -]*$/.test(t)),
        ),
      ].slice(0, 10)
      await db
        .insertInto("posts")
        .values({
          id: crypto.randomUUID(),
          slug,
          ...common,
          cover_image_url: thumb,
          author_name:
            wxr.authors.get(str(it["dc:creator"])) ??
            (str(it["dc:creator"]) || null),
          tags: JSON.stringify(tags),
        })
        .execute()
      counts.posts++
      newPath = `/blog/${slug}`
    } else if (postType === "page") {
      if (RESERVED_SLUGS.has(slug)) slug = `${slug}-page`
      const taken =
        (await db
          .selectFrom("cms_pages")
          .select("id")
          .where("slug", "=", slug)
          .executeTakeFirst()) ||
        (await db
          .selectFrom("content_types")
          .select("id")
          .where("url_prefix", "=", slug)
          .executeTakeFirst())
      if (taken) {
        counts.skipped++
        continue
      }
      await db
        .insertInto("cms_pages")
        .values({
          id: crypto.randomUUID(),
          slug,
          ...common,
          og_image_url: thumb,
        })
        .execute()
      counts.pages++
      newPath = `/${slug}`
    } else {
      let typeId = typeIds.get(postType)
      let prefix = ""
      if (!typeId) {
        const typeSlug =
          postType
            .toLowerCase()
            .replace(/[^a-z0-9_-]+/g, "_")
            .slice(0, 60) || "imported"
        const existing = await db
          .selectFrom("content_types")
          .select(["id", "url_prefix"])
          .where("slug", "=", typeSlug)
          .executeTakeFirst()
        if (existing) {
          typeId = existing.id
          prefix = existing.url_prefix
        } else {
          prefix = slugify(postType) || "items"
          const clash =
            RESERVED_SLUGS.has(prefix) ||
            (await db
              .selectFrom("cms_pages")
              .select("id")
              .where("slug", "=", prefix)
              .executeTakeFirst()) ||
            (await db
              .selectFrom("content_types")
              .select("id")
              .where("url_prefix", "=", prefix)
              .executeTakeFirst())
          if (clash) prefix = `${prefix}-items`
          typeId = crypto.randomUUID()
          await db
            .insertInto("content_types")
            .values({
              id: typeId,
              slug: typeSlug,
              name: titleCase(postType),
              singular: titleCase(postType),
              url_prefix: prefix,
              fields_json: "[]",
            })
            .execute()
          counts.types++
        }
        typeIds.set(postType, typeId)
      } else {
        prefix = (
          await db
            .selectFrom("content_types")
            .select("url_prefix")
            .where("id", "=", typeId)
            .executeTakeFirstOrThrow()
        ).url_prefix
      }
      const taken = await db
        .selectFrom("content_entries")
        .select("id")
        .where("type_id", "=", typeId)
        .where("slug", "=", slug)
        .executeTakeFirst()
      if (taken) {
        counts.skipped++
        continue
      }
      await db
        .insertInto("content_entries")
        .values({
          id: crypto.randomUUID(),
          type_id: typeId,
          slug,
          ...common,
          og_image_url: thumb,
        })
        .execute()
      counts.entries++
      newPath = `/${prefix}/${slug}`
    }
    const oldPath = pathOf(str(it.link))
    if (
      live &&
      oldPath &&
      oldPath !== newPath &&
      oldPath !== `${newPath}/` &&
      oldPath !== "/"
    )
      redirects.push({
        from: oldPath.length > 1 ? oldPath.replace(/\/+$/, "") : oldPath,
        to: newPath,
      })
  }

  for (const r of redirects) {
    const res = await db
      .insertInto("redirects")
      .values({
        from_path: r.from.slice(0, 500),
        to_url: r.to,
        status_code: 301,
      })
      .onConflict((oc) => oc.column("from_path").doNothing())
      .executeTakeFirst()
    if (Number(res.numInsertedOrUpdatedRows ?? 0) > 0) counts.redirects++
  }
  return counts
}

/** Image addresses in imported content that still point at the old site. */
export const remoteImages = async (db: Db, origin: string, limit = 500) => {
  const host = (() => {
    try {
      return new URL(origin).host
    } catch {
      return ""
    }
  })()
  if (!host) return []
  const found = new Set<string>()
  const re =
    /(?:src|href)=\\?"(https?:\/\/[^"\\\s]+?\.(?:jpe?g|png|gif|webp|avif))(?:\\?")/gi
  const scan = (s: string | null) => {
    if (!s) return
    for (const m of s.matchAll(re)) {
      try {
        if (new URL(m[1]).host === host) found.add(m[1])
      } catch {
        /* not a URL */
      }
    }
  }
  for (const table of ["posts", "cms_pages", "content_entries"] as const) {
    const rows = await db
      .selectFrom(table)
      .select(["blocks_json", "og_image_url"])
      .where("blocks_json", "like", `%${host}%`)
      .execute()
    for (const r of rows) {
      scan(r.blocks_json)
      if (r.og_image_url?.includes(host)) found.add(r.og_image_url)
    }
  }
  for (const r of await db
    .selectFrom("posts")
    .select("cover_image_url")
    .where("cover_image_url", "like", `%${host}%`)
    .execute())
    if (r.cover_image_url) found.add(r.cover_image_url)
  const done = new Set(
    (
      await db
        .selectFrom("media")
        .select("source_url")
        .where("source_url", "is not", null)
        .execute()
    ).map((r) => r.source_url),
  )
  return [...found].filter((u) => !done.has(u)).slice(0, limit)
}

/** Points content at the copied image and renders it again. */
export const replaceImageUrl = async (db: Db, from: string, to: string) => {
  const like = `%${from.replace(/[%_\\]/g, "")}%`
  for (const table of ["posts", "cms_pages", "content_entries"] as const) {
    const rows = await db
      .selectFrom(table)
      .select(["id", "blocks_json"])
      .where("blocks_json", "like", like)
      .execute()
    for (const r of rows) {
      const json = (r.blocks_json ?? "[]").split(from).join(to)
      const body = await bodyFrom(db, parseBlocks(json))
      await db
        .updateTable(table)
        .set({ ...body, updated_at: nowIso() })
        .where("id", "=", r.id)
        .execute()
    }
    await db
      .updateTable(table)
      .set({ og_image_url: to })
      .where("og_image_url", "=", from)
      .execute()
  }
  await db
    .updateTable("posts")
    .set({ cover_image_url: to })
    .where("cover_image_url", "=", from)
    .execute()
}
