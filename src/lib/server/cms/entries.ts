import type { Db } from "../db"
import { containsText } from "../db/query"
import { nowIso } from "../db/json"
import { renderMarkdown } from "./markdown"
import {
  parseFieldValues,
  type ContentType,
  type FieldDef,
  type FieldValues,
} from "./types"

// Reading published entries for the public site: archive cards and single entry pages.

const PER_PAGE = 24

const published = (db: Db, typeId: string) =>
  db
    .selectFrom("content_entries")
    .where("type_id", "=", typeId)
    .where("status", "=", "published")
    .where((eb) =>
      eb.or([
        eb("published_at", "is", null),
        eb("published_at", "<=", nowIso()),
      ]),
    )

const firstImage = (type: ContentType, values: FieldValues) => {
  const f = type.fields.find(
    (x) =>
      x.type === "image" && typeof values[x.key] === "string" && values[x.key],
  )
  return f ? String(values[f.key]) : null
}

/** A value as plain text for cards and simple fields. */
export const fieldText = (f: FieldDef, v: FieldValues[string]): string => {
  if (v === null || v === undefined || v === "") return ""
  if (f.type === "boolean") return v ? "Yes" : "No"
  if (f.type === "date" && typeof v === "string") {
    const d = new Date(`${v}T00:00:00Z`)
    return Number.isNaN(d.getTime())
      ? v
      : d.toLocaleDateString("en", {
          year: "numeric",
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        })
  }
  return String(v)
}

export const archiveEntries = async (
  db: Db,
  type: ContentType,
  pageNo: number,
) => {
  const [rows, count] = await Promise.all([
    published(db, type.id)
      .select(["slug", "title", "excerpt", "fields_json"])
      .orderBy("sort_order")
      .orderBy("published_at", "desc")
      .orderBy("title")
      .limit(PER_PAGE)
      .offset((pageNo - 1) * PER_PAGE)
      .execute(),
    published(db, type.id)
      .select((eb) => eb.fn.countAll<number>().as("n"))
      .executeTakeFirst(),
  ])
  const listed = type.fields.filter(
    (f) => f.showInList && f.type !== "image" && f.type !== "markdown",
  )
  return {
    perPage: PER_PAGE,
    total: Number(count?.n ?? 0),
    entries: rows.map((r) => {
      const values = parseFieldValues(r.fields_json)
      return {
        slug: r.slug,
        title: r.title,
        excerpt: r.excerpt,
        image: firstImage(type, values),
        listFields: listed
          .map((f) => ({ label: f.label, value: fieldText(f, values[f.key]) }))
          .filter((x) => x.value),
      }
    }),
  }
}

export type ShownField =
  | { label: string; kind: "text"; value: string }
  | { label: string; kind: "html"; html: string }
  | { label: string; kind: "link"; value: string; href: string }
  | { label: string; kind: "image"; src: string }

/** One published entry with its fields ready to show; relation fields become links. */
export const publishedEntry = async (
  db: Db,
  type: ContentType,
  slug: string,
) => {
  const row = await published(db, type.id)
    .select([
      "id",
      "slug",
      "title",
      "excerpt",
      "fields_json",
      "body_html",
      "seo_title",
      "seo_description",
      "seo_noindex",
      "og_image_url",
      "published_at",
      "updated_at",
    ])
    .where("slug", "=", slug)
    .executeTakeFirst()
  if (!row) return null
  const values = parseFieldValues(row.fields_json)
  const hero = firstImage(type, values)
  const relIds = type.fields
    .filter((f) => f.type === "relation" && typeof values[f.key] === "string")
    .map((f) => String(values[f.key]))
  const related = relIds.length
    ? await db
        .selectFrom("content_entries as e")
        .innerJoin("content_types as t", "t.id", "e.type_id")
        .select(["e.id", "e.title", "e.slug", "t.url_prefix"])
        .where("e.id", "in", relIds)
        .where("e.status", "=", "published")
        .execute()
    : []
  const fields: ShownField[] = []
  let heroUsed = false
  for (const f of type.fields) {
    const v = values[f.key]
    if (v === null || v === undefined || v === "") continue
    if (f.type === "image") {
      if (!heroUsed && v === hero) {
        heroUsed = true
        continue
      }
      fields.push({ label: f.label, kind: "image", src: String(v) })
    } else if (f.type === "markdown") {
      fields.push({
        label: f.label,
        kind: "html",
        html: renderMarkdown(String(v)),
      })
    } else if (f.type === "link") {
      fields.push({
        label: f.label,
        kind: "link",
        value: String(v).replace(/^(https?:\/\/|mailto:|tel:)/, ""),
        href: String(v),
      })
    } else if (f.type === "relation") {
      const r = related.find((x) => x.id === v)
      if (r)
        fields.push({
          label: f.label,
          kind: "link",
          value: r.title,
          href: `/${r.url_prefix}/${r.slug}`,
        })
    } else {
      fields.push({ label: f.label, kind: "text", value: fieldText(f, v) })
    }
  }
  return { ...row, hero, fields }
}

/** Published entries of searchable types whose title, excerpt or text contains the words. */
export const searchEntries = (db: Db, q: string, limit = 10) =>
  db
    .selectFrom("content_entries as e")
    .innerJoin("content_types as t", "t.id", "e.type_id")
    .select(["e.slug", "e.title", "e.excerpt", "t.url_prefix", "t.singular"])
    .where("t.in_search", "=", 1)
    .where("e.status", "=", "published")
    .where((eb) =>
      eb.or([
        containsText("e.title", q),
        containsText("e.excerpt", q),
        containsText("e.body_md", q),
        containsText("e.fields_json", q),
      ]),
    )
    .orderBy("e.title")
    .limit(limit)
    .execute()
