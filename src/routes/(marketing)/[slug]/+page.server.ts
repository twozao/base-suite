import { error } from "@sveltejs/kit"
import { requireModule } from "$lib/server/auth/staff"
import { SLUG_RE, RESERVED_SLUGS, publishedPage } from "$lib/server/cms/pages"
import { excerptFrom } from "$lib/server/cms/markdown"
import type { PageServerLoad } from "./$types"

// Public CMS pages. Content is pre-sanitised HTML and only published pages are read. Responses
// are cached at the CDN briefly so popular pages rarely touch the database.
export const load: PageServerLoad = async ({ params, locals, setHeaders }) => {
  requireModule("cms")
  const slug = params.slug
  if (!SLUG_RE.test(slug) || RESERVED_SLUGS.has(slug)) error(404, "Not found")

  const page = await publishedPage(locals.db, slug)
  if (!page) error(404, "Not found")

  // Signed-in visitors carry auth cookies, so keep their copy private.
  setHeaders({
    "cache-control": locals.user
      ? "private, max-age=0"
      : "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
  })

  return {
    page: {
      title: page.title,
      excerpt: page.excerpt ?? "",
      html: page.body_html,
      metaTitle: page.seo_title || page.title,
      metaDescription:
        page.seo_description || page.excerpt || excerptFrom(page.body_html),
      updatedAt: page.updated_at,
    },
  }
}
