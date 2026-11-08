import type { RequestHandler } from "@sveltejs/kit"
import * as sitemap from "super-sitemap"
import { isModuleEnabled } from "$lib/modules"
import { publishedPosts } from "$lib/server/posts"
import { listEventTypes } from "$lib/server/booking/event_types"
import { publishedArticles } from "$lib/server/kb"

// Rendered on request (not prerendered) so published CMS pages appear without
// a rebuild. Cached at the CDN for an hour.
export const GET: RequestHandler = async ({ locals, setHeaders, url }) => {
  const helpSlugs = isModuleEnabled("kb")
    ? (
        await publishedArticles(locals.db).select("slug").limit(5000).execute()
      ).map((a) => a.slug)
    : []
  const formSlugs = isModuleEnabled("forms")
    ? (
        await locals.db
          .selectFrom("forms")
          .select("slug")
          .where("active", "=", 1)
          .limit(500)
          .execute()
      ).map((f) => f.slug)
    : []
  let slugs: string[] = []
  let postSlugs: string[] = []
  let entryPaths: string[][] = []
  const bookSlugs = isModuleEnabled("booking")
    ? (await listEventTypes(locals.db, { activeOnly: true })).map((t) => t.slug)
    : []
  if (isModuleEnabled("cms")) {
    const [pages, posts] = await Promise.all([
      locals.db
        .selectFrom("cms_pages")
        .select("slug")
        .where("status", "=", "published")
        .where("seo_noindex", "=", 0)
        .limit(5000)
        .execute(),
      publishedPosts(locals.db)
        .select("slug")
        .where("seo_noindex", "=", 0)
        .limit(5000)
        .execute(),
    ])
    const [archives, entries] = await Promise.all([
      locals.db
        .selectFrom("content_types")
        .select("url_prefix")
        .where("has_archive", "=", 1)
        .execute(),
      locals.db
        .selectFrom("content_entries as e")
        .innerJoin("content_types as t", "t.id", "e.type_id")
        .select(["t.url_prefix", "e.slug"])
        .where("e.status", "=", "published")
        .where("e.seo_noindex", "=", 0)
        .limit(5000)
        .execute(),
    ])
    slugs = [...pages.map((p) => p.slug), ...archives.map((a) => a.url_prefix)]
    postSlugs = posts.map((p) => p.slug)
    entryPaths = entries.map((e) => [e.url_prefix, e.slug])
  }
  setHeaders({ "cache-control": "public, max-age=600, s-maxage=3600" })
  return await sitemap.response({
    origin: url.origin,
    excludeRoutePatterns: [
      ".*\\(admin\\).*", // routes within the (admin) group
      "^/admin.*",
      "^/api.*",
      // Route ids still hold the (marketing) group here, so these match on the tail.
      "/search$",
      "/login",
      "/newsletter/(confirm|unsubscribe)$",
      "/book/manage",
      "/ticket/",
      ...(isModuleEnabled("kb") ? [] : ["/help($|/)"]),
      ...(isModuleEnabled("forms") ? [] : ["/forms/"]),
      ...(isModuleEnabled("booking") ? [] : ["/book($|/)"]),
      ...(isModuleEnabled("subscriptions") ? [] : ["/pricing$"]),
      ...(isModuleEnabled("contact") ? [] : ["/contact_us$"]),
    ],
    paramValues: {
      "/[slug]": slugs,
      "/blog/[slug]": postSlugs,
      "/[slug]/[entry]": entryPaths,
      ...(isModuleEnabled("booking") ? { "/book/[slug]": bookSlugs } : {}),
      ...(isModuleEnabled("kb") ? { "/help/[slug]": helpSlugs } : {}),
      ...(isModuleEnabled("forms") ? { "/forms/[slug]": formSlugs } : {}),
    },
  })
}
