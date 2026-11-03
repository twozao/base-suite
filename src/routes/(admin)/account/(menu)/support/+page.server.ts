import { redirect } from "@sveltejs/kit"
import { requireModule } from "$lib/server/auth/staff"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ locals, depends }) => {
  requireModule("chat")
  if (!locals.user) redirect(303, "/login")
  depends("account:support")
  // User's own client: RLS limits this to their conversations and messages.
  const { data: conversation } = await locals.supabase
    .from("chat_conversations")
    .select("id, status, created_at")
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  let messages: {
    id: number
    sender: string
    body: string
    created_at: string
  }[] = []
  if (conversation) {
    const { data } = await locals.supabase
      .from("chat_messages")
      .select("id, sender, body, created_at")
      .eq("conversation_id", conversation.id)
      .order("id")
      .limit(500)
    messages = data ?? []
    await locals.supabaseServiceRole
      .from("chat_conversations")
      .update({ unread_by_visitor: 0 })
      .eq("id", conversation.id)
      .eq("user_id", locals.user.id)
  }
  return { conversation, messages }
}
