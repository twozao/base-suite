import { LOCALE_CODES } from "../../i18n"
import { z } from "zod"
import type { Db } from "../db"
import { containsText } from "../db/query"
import type { CmsStatus } from "../db/schema"

// Slugs that would collide with built-in routes.
export const RESERVED_SLUGS = new Set([
  "account",
  "admin",
  "api",
  "auth",
  "blog",
  "book",
  "contact_us",
  "contact",
  "login",
  "logout",
  "pricing",
  "search",
  "sitemap",
  "sitemap.xml",
  "rss",
  "static",
  "assets",
  "_app",
  "favicon",
  "robots",
  "p",
  "assistant",
  "help",
  "forms",
  "ticket",
  "newsletter",
  ...LOCALE_CODES,
])

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

export const slugify = (input: string): string =>
  input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)
    .replace(/-+$/g, "")

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))

export const pageInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(100)
    .regex(SLUG_RE, "Use lowercase letters, numbers and dashes")
    .refine((s) => !RESERVED_SLUGS.has(s), "This URL is reserved"),
  body_md: z.string().max(200_000, "Page is too long"),
  excerpt: optionalText(500),
  seo_title: optionalText(200),
  seo_description: optionalText(500),
})

export type PageInput = z.output<typeof pageInputSchema>

/** Narrows the ?status= query value the admin listings accept. */
export const isCmsStatus = (v: string): v is CmsStatus =>
  v === "draft" || v === "published" || v === "archived"

/** The published page at a slug, or undefined. Drafts and archived pages are never served. */
export const publishedPage = (db: Db, slug: string) =>
  db
    .selectFrom("cms_pages")
    .select([
      "id",
      "title",
      "body_html",
      "excerpt",
      "seo_title",
      "seo_description",
      "og_image_url",
      "seo_noindex",
      "template",
      "updated_at",
    ])
    .where("slug", "=", slug)
    .where("status", "=", "published")
    .executeTakeFirst()

/** Case-insensitive search over title, excerpt and markdown of published pages. */
export const searchPages = (db: Db, q: string, limit = 10) =>
  db
    .selectFrom("cms_pages")
    .select(["slug", "title", "excerpt"])
    .where("status", "=", "published")
    .where((eb) =>
      eb.or([
        containsText("cms_pages.title", q),
        containsText("cms_pages.excerpt", q),
        containsText("cms_pages.body_md", q),
      ]),
    )
    .orderBy("title")
    .limit(limit)
    .execute()
