import { z } from "zod"
import { pageInputSchema } from "./cms/pages"
import { imageUrl } from "./content_schema"

export const POST_CARD_FIELDS =
  "slug, title, excerpt, cover_image_url, tags, published_at, author_name"

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
