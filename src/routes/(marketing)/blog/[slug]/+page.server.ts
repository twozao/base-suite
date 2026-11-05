import { error } from "@sveltejs/kit"
import { excerptFrom } from "$lib/server/cms/markdown"
import { nowIso } from "$lib/server/db/json"
import { publishedPosts, relatedPosts, withTags } from "$lib/server/posts"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(params.slug)) error(404, "Not found")
  const now = nowIso()
  const row = await publishedPosts(locals.db, now)
    .select([
      "slug",
      "title",
      "excerpt",
      "body_html",
      "cover_image_url",
      "author_name",
      "tags",
      "seo_title",
      "seo_description",
      "published_at",
      "updated_at",
    ])
    .where("slug", "=", params.slug)
    .executeTakeFirst()
  if (!row) error(404, "Post not found")
  const post = withTags(row)

  const related = await relatedPosts(locals.db, post.slug, post.tags, 3, now)

  const words = post.body_html
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length
  return {
    post,
    readingMinutes: Math.max(1, Math.round(words / 220)),
    metaTitle: post.seo_title || post.title,
    metaDescription:
      post.seo_description || post.excerpt || excerptFrom(post.body_html),
    related,
  }
}
