import { redirect } from "@sveltejs/kit"
import { isModuleEnabled } from "$lib/modules"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ locals }) => {
  const user = locals.user
  if (!user) redirect(303, "/login")
  const db = locals.supabaseServiceRole
  const now = new Date().toISOString()
  const [sub, bookings, chat] = await Promise.all([
    isModuleEnabled("subscriptions")
      ? db
          .from("subscriptions")
          .select("status, current_period_end, cancel_at_period_end")
          .eq("user_id", user.id)
          .in("status", ["active", "trialing", "past_due"])
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : null,
    isModuleEnabled("booking")
      ? db
          .from("bookings")
          .select("id, event_name, start_time, reschedule_url, cancel_url")
          .eq("user_id", user.id)
          .eq("status", "scheduled")
          .gte("start_time", now)
          .order("start_time")
          .limit(3)
      : null,
    isModuleEnabled("chat")
      ? db
          .from("chat_conversations")
          .select("id, status, unread_by_visitor, last_message_at")
          .eq("user_id", user.id)
          .order("last_message_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : null,
  ])
  return {
    subscription: sub?.data ?? null,
    upcoming: bookings?.data ?? [],
    chat: chat?.data ?? null,
  }
}

export const actions: Actions = {
  signout: async ({ locals: { supabase, safeGetSession } }) => {
    const { session } = await safeGetSession()
    if (session) {
      await supabase.auth.signOut()
      redirect(303, "/")
    }
  },
}
