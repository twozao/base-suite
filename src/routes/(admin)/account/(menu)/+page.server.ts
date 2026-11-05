import { redirect } from "@sveltejs/kit"
import { isModuleEnabled } from "$lib/modules"
import {
  userConversation,
  userSubscription,
  userUpcomingBookings,
} from "$lib/server/portal"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ locals }) => {
  const user = locals.user
  if (!user) redirect(303, "/login")
  const db = locals.db
  const [subscription, upcoming, chat] = await Promise.all([
    isModuleEnabled("subscriptions") ? userSubscription(db, user.id) : null,
    isModuleEnabled("booking") ? userUpcomingBookings(db, user.id) : [],
    isModuleEnabled("chat") ? userConversation(db, user.id) : null,
  ])
  return { subscription, upcoming, chat }
}
