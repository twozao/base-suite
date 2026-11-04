import { redirect } from "@sveltejs/kit"
import { requireModule } from "$lib/server/auth/staff"
import {
  markReadByUser,
  userConversation,
  userMessages,
} from "$lib/server/portal"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ locals, depends }) => {
  requireModule("chat")
  if (!locals.user) redirect(303, "/login")
  depends("account:support")
  const db = locals.db
  const conversation = await userConversation(db, locals.user.id)
  let messages: {
    id: number
    sender: string
    body: string
    created_at: string
  }[] = []
  if (conversation) {
    messages = await userMessages(db, locals.user.id, conversation.id)
    await markReadByUser(db, locals.user.id, conversation.id)
  }
  return { conversation, messages }
}
