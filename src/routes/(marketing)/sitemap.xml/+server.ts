import type { RequestHandler } from "@sveltejs/kit"
import * as sitemap from "super-sitemap"
import { isModuleEnabled } from "$lib/modules"
import { publishedPosts } from "$lib/server/posts"

// Rendered on request (not prerendered) so published CMS pages appear without
// a rebuild. Cached at the CDN for an hour.
export const GET: RequestHandler = async ({ locals, setHeaders, url }) => {
  let slugs: string[] = []
  let postSlugs: string[] = []
  if (isModuleEnabled("cms")) {
    const [pages, posts] = await Promise.all([
      locals.db
        .selectFrom("cms_pages")
        .select("slug")
        .where("status", "=", "published")
        .limit(5000)
        .execute(),
      publishedPosts(locals.db).select("slug").limit(5000).execute(),
    ])
    slugs = pages.map((p) => p.slug)
    postSlugs = posts.map((p) => p.slug)
  }
  setHeaders({ "cache-control": "public, max-age=600, s-maxage=3600" })
  return await sitemap.response({
    origin: url.origin,
    excludeRoutePatterns: [
      ".*\\(admin\\).*", // routes within the (admin) group
      "^/admin.*",
      "^/api.*",
      "^/search$",
      ...(isModuleEnabled("booking") ? [] : ["^/book$"]),
      ...(isModuleEnabled("subscriptions") ? [] : ["^/pricing$"]),
      ...(isModuleEnabled("contact") ? [] : ["^/contact_us$"]),
    ],
    paramValues: { "/[slug]": slugs, "/blog/[slug]": postSlugs },
  })
}
