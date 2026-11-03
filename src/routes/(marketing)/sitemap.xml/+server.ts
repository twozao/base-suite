import type { RequestHandler } from "@sveltejs/kit"
import * as sitemap from "super-sitemap"
import { isModuleEnabled } from "$lib/modules"

// Rendered on request (not prerendered) so published CMS pages appear without
// a rebuild. Cached at the CDN for an hour.
export const GET: RequestHandler = async ({ locals, setHeaders, url }) => {
  let slugs: string[] = []
  let postSlugs: string[] = []
  if (isModuleEnabled("cms")) {
    const [pages, posts] = await Promise.all([
      locals.supabase
        .from("cms_pages")
        .select("slug")
        .eq("status", "published")
        .limit(5000),
      locals.supabase
        .from("posts")
        .select("slug")
        .eq("status", "published")
        .lte("published_at", new Date().toISOString())
        .limit(5000),
    ])
    slugs = (pages.data ?? []).map((p) => p.slug)
    postSlugs = (posts.data ?? []).map((p) => p.slug)
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
