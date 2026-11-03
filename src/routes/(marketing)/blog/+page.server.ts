import { POST_CARD_FIELDS } from "$lib/server/posts"
import type { PageServerLoad } from "./$types"

const PAGE_SIZE = 9

export const load: PageServerLoad = async ({ locals, url }) => {
  const tag = (url.searchParams.get("tag") ?? "")
    .trim()
    .toLowerCase()
    .slice(0, 40)
  const raw = Number(url.searchParams.get("page"))
  const page = Number.isInteger(raw) && raw > 0 && raw < 1000 ? raw : 1
  const from = (page - 1) * PAGE_SIZE

  let query = locals.supabase
    .from("posts")
    .select(POST_CARD_FIELDS, { count: "exact" })
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1)
  if (tag) query = query.contains("tags", [tag])

  const [{ data: posts, count }, { data: tagRows }] = await Promise.all([
    query,
    locals.supabase
      .from("posts")
      .select("tags")
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .limit(500),
  ])
  const tags = [...new Set((tagRows ?? []).flatMap((r) => r.tags))].sort()

  return {
    posts: posts ?? [],
    total: count ?? 0,
    page,
    pages: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)),
    tag,
    tags,
  }
}
