import { searchPages } from "$lib/server/cms/pages"
import { searchPosts } from "$lib/server/posts"
import { searchArticles } from "$lib/server/kb"
import { isModuleEnabled } from "$lib/modules"
import { clientIp } from "$lib/server/security/request"
import { rateLimit, RATE_LIMITS } from "$lib/server/security/rate_limit"
import type { PageServerLoad } from "./$types"

// Server-side search over published posts and pages. A lower() + LIKE scan is plenty for small
// sites and runs the same on SQLite and Postgres; switch to full-text search at thousands of posts.
export const load: PageServerLoad = async (event) => {
  const { locals, url } = event
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100)
  if (q.length < 2) return { q, results: [] }
  if (
    !(await rateLimit(
      locals.db,
      `search:${clientIp(event)}`,
      RATE_LIMITS.search,
    ))
  )
    return { q, results: [], limited: true }
  const [posts, pages, articles] = await Promise.all([
    searchPosts(locals.db, q),
    searchPages(locals.db, q),
    isModuleEnabled("kb") ? searchArticles(locals.db, q) : [],
  ])
  return {
    q,
    results: [
      ...pages.map((p) => ({
        href: `/${p.slug}`,
        title: p.title,
        excerpt: p.excerpt,
        kind: "Page",
      })),
      ...posts.map((p) => ({
        href: `/blog/${p.slug}`,
        title: p.title,
        excerpt: p.excerpt,
        kind: "Blog",
      })),
      ...articles.map((a) => ({
        href: `/help/${a.slug}`,
        title: a.title,
        excerpt: a.excerpt,
        kind: "Help",
      })),
    ],
  }
}
