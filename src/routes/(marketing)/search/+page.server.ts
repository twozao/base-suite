import { searchPages } from "$lib/server/cms/pages"
import { searchPosts } from "$lib/server/posts"
import type { PageServerLoad } from "./$types"

// Server-side search over published posts and pages. A lower() + LIKE scan is plenty for small
// sites and runs the same on SQLite and Postgres; switch to full-text search at thousands of posts.
export const load: PageServerLoad = async ({ locals, url }) => {
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100)
  if (q.length < 2) return { q, results: [] }
  const [posts, pages] = await Promise.all([
    searchPosts(locals.db, q),
    searchPages(locals.db, q),
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
    ],
  }
}
