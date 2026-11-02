import type { RequestHandler } from "@sveltejs/kit"
import * as sitemap from "super-sitemap"
import { WebsiteBaseUrl } from "../../../config"
import { isModuleEnabled } from "$lib/modules"

// Rendered on request (not prerendered) so published CMS pages appear without
// a rebuild. Cached at the CDN for an hour.
export const GET: RequestHandler = async ({ locals, setHeaders }) => {
  let slugs: string[] = []
  if (isModuleEnabled("cms")) {
    const { data } = await locals.supabase
      .from("cms_pages")
      .select("slug")
      .eq("status", "published")
      .limit(5000)
    slugs = (data ?? []).map((p) => p.slug)
  }
  setHeaders({ "cache-control": "public, max-age=600, s-maxage=3600" })
  return await sitemap.response({
    origin: WebsiteBaseUrl,
    excludeRoutePatterns: [
      ".*\\(admin\\).*", // routes within the (admin) group
      "^/admin.*",
      "^/api.*",
      ...(isModuleEnabled("booking") ? [] : ["^/book$"]),
      ...(isModuleEnabled("subscriptions") ? [] : ["^/pricing$"]),
      ...(isModuleEnabled("contact") ? [] : ["^/contact_us$"]),
    ],
    paramValues: { "/[slug]": slugs },
  })
}
