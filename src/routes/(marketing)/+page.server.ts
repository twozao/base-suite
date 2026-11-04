import { getSettings } from "$lib/server/settings"
import { plansForDisplay } from "$lib/server/pricing"
import { listPostCards } from "$lib/server/posts"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ locals }) => {
  const db = locals.db
  const [s, latestPosts] = await Promise.all([
    getSettings(db),
    listPostCards(db, { limit: 3 }),
  ])
  return {
    home: s.home,
    plans: plansForDisplay(s.pricing.plans, !!locals.user),
    latestPosts,
  }
}
