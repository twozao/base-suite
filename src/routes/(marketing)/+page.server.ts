import { getSettings } from "$lib/server/settings"
import { plansForDisplay } from "$lib/server/pricing"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ locals }) => {
  const db = locals.supabaseServiceRole
  const s = await getSettings(db)
  const { data: posts } = await locals.supabase
    .from("posts")
    .select(
      "slug, title, excerpt, cover_image_url, tags, published_at, author_name",
    )
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(3)
  return {
    home: s.home,
    plans: plansForDisplay(s.pricing.plans, !!locals.user),
    latestPosts: posts ?? [],
  }
}
