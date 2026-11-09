import { error, json } from "@sveltejs/kit"
import { requireModule } from "$lib/server/auth/staff"
import { getSettings } from "$lib/server/settings"
import { isSameOrigin, clientIp } from "$lib/server/security/request"
import { rateLimit, RATE_LIMITS } from "$lib/server/security/rate_limit"
import {
  addMessage,
  chatPostSchema,
  findConversation,
  listMessages,
  startConversation,
} from "$lib/server/chat/service"
import { sendAdminEmail } from "$lib/mailer"
import { captureLead } from "$lib/server/crm"
import type { RequestHandler } from "./$types"

const noStore = { "cache-control": "private, no-store" }

// GET /api/chat?after=<id>: widget state + new messages since `after`.
export const GET: RequestHandler = async (event) => {
  requireModule("chat")
  const db = event.locals.db
  const settings = await getSettings(db)
  if (!settings.chat.enabled) {
    return json({ enabled: false }, { headers: noStore })
  }
  if (
    !(await rateLimit(db, `chat:poll:${clientIp(event)}`, RATE_LIMITS.chatPoll))
  ) {
    error(429, "Too many requests")
  }

  const after = Math.max(0, Number(event.url.searchParams.get("after")) || 0)
  const conversation = await findConversation(event)
  const messages = conversation
    ? await listMessages(event, conversation.id, after)
    : []
  if (conversation && messages.some((m) => m.sender === "staff")) {
    await db
      .updateTable("chat_conversations")
      .set({ unread_by_visitor: 0 })
      .where("id", "=", conversation.id)
      .execute()
  }

  return json(
    {
      enabled: true,
      greeting: settings.chat.greeting,
      offlineMessage: settings.chat.offlineMessage,
      requireEmail: settings.chat.requireEmail && !event.locals.user,
      signedIn: !!event.locals.user,
      conversation,
      messages,
    },
    { headers: noStore },
  )
}

// POST /api/chat: send a message, starting a conversation if needed.
export const POST: RequestHandler = async (event) => {
  requireModule("chat")
  if (!isSameOrigin(event)) error(403, "Cross-origin request blocked")
  const db = event.locals.db
  const settings = await getSettings(db)
  if (!settings.chat.enabled) error(404, "Chat is disabled")

  let body: unknown
  try {
    body = await event.request.json()
  } catch {
    error(400, "Invalid JSON")
  }
  const parsed = chatPostSchema.safeParse(body)
  if (!parsed.success) {
    return json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    )
  }
  const input = parsed.data
  const ip = clientIp(event)

  let conversation = await findConversation(event)
  if (!conversation) {
    if (settings.chat.requireEmail && !event.locals.user && !input.email) {
      return json({ error: "Please enter your email" }, { status: 400 })
    }
    if (!(await rateLimit(db, `chat:start:${ip}`, RATE_LIMITS.chatStart))) {
      error(429, "Too many conversations. Please try again later.")
    }
    conversation = await startConversation(event, input)
    await captureLead(db, {
      email: event.locals.user?.email ?? input.email,
      name: input.name,
      userId: event.locals.user?.id,
      source: "chat",
      kind: "chat",
      body: input.message,
      ref: { type: "chat", id: conversation.id },
    })
    if (settings.chat.notifyAdminOnNew) {
      await sendAdminEmail({
        db: event.locals.db,
        subject: "New live chat",
        body: `New chat from ${input.name || "a visitor"} (${event.locals.user?.email ?? input.email ?? "no email"}):\n\n${input.message}\n\nReply in the admin portal: ${event.url.origin}/admin/support/${conversation.id}`,
      })
    }
  }

  if (
    !(await rateLimit(
      db,
      `chat:msg:${conversation.id}`,
      RATE_LIMITS.chatMessage,
    )) ||
    !(await rateLimit(db, `chat:msg-ip:${ip}`, RATE_LIMITS.chatMessage))
  ) {
    error(429, "You're sending messages too quickly")
  }

  const message = await addMessage(
    event,
    conversation.id,
    "visitor",
    input.message,
  )
  return json({ conversation, message }, { headers: noStore })
}
