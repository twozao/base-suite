import { sql } from "kysely"
import { z } from "zod"
import type { Db } from "./db"
import { nowIso, parseStringList } from "./db/json"
import { containsText } from "./db/query"
import { pageInputSchema } from "./cms/pages"
import { imageUrl } from "./content_schema"

export const TAG_RE = /^[a-z0-9][a-z0-9 -]*$/

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
        .regex(TAG_RE, "Tags: letters, numbers, spaces and dashes"),
    ),
  )

// Posts share the page fields, plus blog-specific ones. Post slugs live under
// /blog/, so the top-level reserved list doesn't apply.
export const postInputSchema = pageInputSchema.omit({ slug: true }).extend({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(100)
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers and dashes",
    ),
  cover_image_url: imageUrl.transform((v) => (v === "" ? null : v)),
  author_name: z
    .string()
    .trim()
    .max(120)
    .transform((v) => (v === "" ? null : v)),
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

export type PostInput = z.output<typeof postInputSchema>

/** Columns a blog card needs (listings, homepage, related posts). */
export const POST_CARD_COLUMNS = [
  "slug",
  "title",
  "excerpt",
  "cover_image_url",
  "tags",
  "published_at",
  "author_name",
] as const

export type PostCard = {
  slug: string
  title: string
  excerpt: string | null
  cover_image_url: string | null
  tags: string[]
  published_at: string | null
  author_name: string | null
}

/** tags is JSON text in the database; every row handed to the UI carries it as string[]. */
export const withTags = <T extends { tags: string }>(
  row: T,
): Omit<T, "tags"> & { tags: string[] } => ({
  ...row,
  tags: parseStringList(row.tags),
})

/** Posts the public can see: published, with a publish date that has passed. */
export const publishedPosts = (db: Db, now = nowIso()) =>
  db
    .selectFrom("posts")
    .where("status", "=", "published")
    .where("published_at", "<=", now)

/** Matches one tag inside the JSON array; tags are limited to [a-z0-9 -] so the quoted match is exact. */
export const hasTag = (tag: string) =>
  sql<boolean>`posts.tags like ${'%"' + tag + '"%'}`

export const listPostCards = async (
  db: Db,
  opts: { tag?: string; limit: number; offset?: number; now?: string },
): Promise<PostCard[]> => {
  let q = publishedPosts(db, opts.now).select(POST_CARD_COLUMNS)
  if (opts.tag) q = q.where(hasTag(opts.tag))
  const rows = await q
    .orderBy("published_at", "desc")
    .limit(opts.limit)
    .offset(opts.offset ?? 0)
    .execute()
  return rows.map(withTags)
}

export const countPublishedPosts = async (
  db: Db,
  opts: { tag?: string; now?: string } = {},
): Promise<number> => {
  let q = publishedPosts(db, opts.now)
  if (opts.tag) q = q.where(hasTag(opts.tag))
  const { n } = await q
    .select(db.fn.countAll<number>().as("n"))
    .executeTakeFirstOrThrow()
  return Number(n)
}

/** Every tag on a visible post, sorted, for the blog filter bar. */
export const publishedTags = async (
  db: Db,
  now?: string,
): Promise<string[]> => {
  const rows = await publishedPosts(db, now).select("tags").limit(500).execute()
  return [...new Set(rows.flatMap((r) => parseStringList(r.tags)))].sort()
}

/** Other visible posts sharing a tag, newest first; with no tags, simply the newest posts. */
export const relatedPosts = async (
  db: Db,
  slug: string,
  tags: string[],
  limit = 3,
  now?: string,
): Promise<PostCard[]> => {
  let q = publishedPosts(db, now)
    .select(POST_CARD_COLUMNS)
    .where("slug", "!=", slug)
  const safe = tags.filter((t) => TAG_RE.test(t))
  if (safe.length) q = q.where((eb) => eb.or(safe.map(hasTag)))
  const rows = await q.orderBy("published_at", "desc").limit(limit).execute()
  return rows.map(withTags)
}

/** Case-insensitive search over title, excerpt and markdown of visible posts. */
export const searchPosts = (db: Db, q: string, limit = 20, now?: string) =>
  publishedPosts(db, now)
    .select(["slug", "title", "excerpt", "published_at"])
    .where((eb) =>
      eb.or([
        containsText("posts.title", q),
        containsText("posts.excerpt", q),
        containsText("posts.body_md", q),
      ]),
    )
    .orderBy("published_at", "desc")
    .limit(limit)
    .execute()
