import { ilikeTerm } from "$lib/server/pagination"
import type { PageServerLoad } from "./$types"

// Server-side search over published posts and pages (RLS limits results to
// published content). Plain ILIKE is plenty for small sites; switch to
// Postgres full-text search if you have thousands of posts.
export const load: PageServerLoad = async ({ locals, url }) => {
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100)
  if (q.length < 2) return { q, results: [] }
  const t = ilikeTerm(q)
  const [posts, pages] = await Promise.all([
    locals.supabase
      .from("posts")
      .select("slug, title, excerpt, published_at")
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .or(`title.ilike.${t},excerpt.ilike.${t},body_md.ilike.${t}`)
      .order("published_at", { ascending: false })
      .limit(20),
    locals.supabase
      .from("cms_pages")
      .select("slug, title, excerpt")
      .eq("status", "published")
      .or(`title.ilike.${t},excerpt.ilike.${t},body_md.ilike.${t}`)
      .limit(10),
  ])
  return {
    q,
    results: [
      ...(pages.data ?? []).map((p) => ({
        href: `/${p.slug}`,
        title: p.title,
        excerpt: p.excerpt,
        kind: "Page",
      })),
      ...(posts.data ?? []).map((p) => ({
        href: `/blog/${p.slug}`,
        title: p.title,
        excerpt: p.excerpt,
        kind: "Blog",
      })),
    ],
  }
}
