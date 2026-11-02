import { z } from "zod"

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
])

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

export const slugify = (input: string): string =>
  input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
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
