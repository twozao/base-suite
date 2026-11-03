import { error } from "@sveltejs/kit"
import { excerptFrom } from "$lib/server/cms/markdown"
import { POST_CARD_FIELDS } from "$lib/server/posts"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(params.slug)) error(404, "Not found")
  const { data: post } = await locals.supabase
    .from("posts")
    .select(
      "slug, title, excerpt, body_html, cover_image_url, author_name, tags, seo_title, seo_description, published_at, updated_at",
    )
    .eq("slug", params.slug)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .maybeSingle()
  if (!post) error(404, "Post not found")

  let relatedQuery = locals.supabase
    .from("posts")
    .select(POST_CARD_FIELDS)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .neq("slug", post.slug)
    .order("published_at", { ascending: false })
    .limit(3)
  if (post.tags.length) relatedQuery = relatedQuery.overlaps("tags", post.tags)
  const { data: related } = await relatedQuery

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
    related: related ?? [],
  }
}
