import { z } from "zod"
import type { RequestEvent } from "@sveltejs/kit"
import type { Db } from "../db"
import { nowIso } from "../db/json"
import type { ChatMessageRow, ChatSender } from "../db/schema"
import { randomToken, sha256Hex } from "../security/crypto"

export const CHAT_COOKIE = "chat_session"
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export const chatPostSchema = z.object({
  message: z.string().trim().min(1, "Message is empty").max(4000),
  name: z.string().trim().max(200).optional(),
  email: z
    .string()
    .trim()
    .max(320)
    .email("Invalid email")
    .optional()
    .or(z.literal("")),
  pageUrl: z.string().max(2000).optional(),
})

export type PublicMessage = Pick<
  ChatMessageRow,
  "id" | "sender" | "body" | "created_at"
>

const MESSAGE_FIELDS = ["id", "sender", "body", "created_at"] as const

/** Find the caller's conversation: by account if signed in, else by cookie. */
export const findConversation = async (event: RequestEvent) => {
  const db = event.locals.db
  const user = event.locals.user
  if (user) {
    const row = await db
      .selectFrom("chat_conversations")
      .select(["id", "status"])
      .where("user_id", "=", user.id)
      .orderBy("last_message_at", "desc")
      .limit(1)
      .executeTakeFirst()
    return row ?? null
  }
  const token = event.cookies.get(CHAT_COOKIE)
  if (!token || token.length > 100) return null
  const row = await db
    .selectFrom("chat_conversations")
    .select(["id", "status"])
    .where("visitor_token_hash", "=", await sha256Hex(token))
    .executeTakeFirst()
  return row ?? null
}

export const startConversation = async (
  event: RequestEvent,
  input: { name?: string; email?: string; pageUrl?: string },
) => {
  const db = event.locals.db
  const user = event.locals.user
  let tokenHash: string | null = null
  let token: string | null = null
  if (!user) {
    token = randomToken()
    tokenHash = await sha256Hex(token)
  }

  let pageUrl: string | null = null
  if (input.pageUrl) {
    try {
      const u = new URL(input.pageUrl)
      // Only record pages on our own site
      if (u.origin === event.url.origin) pageUrl = u.pathname + u.search
    } catch {
      /* ignore */
    }
  }

  const row = await db
    .insertInto("chat_conversations")
    .values({
      id: crypto.randomUUID(),
      user_id: user?.id ?? null,
      visitor_token_hash: tokenHash,
      visitor_name: input.name || null,
      visitor_email: user?.email ?? (input.email || null),
      page_url: pageUrl,
    })
    .returning(["id", "status"])
    .executeTakeFirstOrThrow()

  if (token) {
    event.cookies.set(CHAT_COOKIE, token, {
      path: "/api/chat",
      httpOnly: true,
      sameSite: "strict",
      secure: event.url.protocol === "https:",
      maxAge: COOKIE_MAX_AGE,
    })
  }
  return row
}

/**
 * Appends a message and keeps the conversation's counters in step, in one transaction: a visitor
 * message counts as unread for staff and re-opens a closed conversation, a staff message counts
 * as unread for the visitor.
 */
export const appendMessage = async (
  db: Db,
  conversationId: string,
  sender: ChatSender,
  body: string,
  authorId: string | null,
): Promise<PublicMessage> =>
  db.transaction().execute(async (trx) => {
    const message = await trx
      .insertInto("chat_messages")
      .values({
        conversation_id: conversationId,
        sender,
        body,
        author_id: authorId,
      })
      .returning(MESSAGE_FIELDS)
      .executeTakeFirstOrThrow()
    const conversation = await trx
      .selectFrom("chat_conversations")
      .select(["status", "unread_by_staff", "unread_by_visitor"])
      .where("id", "=", conversationId)
      .executeTakeFirstOrThrow()
    await trx
      .updateTable("chat_conversations")
      .set({
        last_message_at: message.created_at ?? nowIso(),
        unread_by_staff:
          sender === "visitor"
            ? conversation.unread_by_staff + 1
            : conversation.unread_by_staff,
        unread_by_visitor:
          sender === "staff"
            ? conversation.unread_by_visitor + 1
            : conversation.unread_by_visitor,
        status:
          sender === "visitor" && conversation.status === "closed"
            ? "open"
            : conversation.status,
      })
      .where("id", "=", conversationId)
      .execute()
    return message
  })

export const addMessage = (
  event: RequestEvent,
  conversationId: string,
  sender: ChatSender,
  body: string,
) =>
  appendMessage(
    event.locals.db,
    conversationId,
    sender,
    body,
    sender === "system" ? null : (event.locals.user?.id ?? null),
  )

export const listMessages = async (
  event: RequestEvent,
  conversationId: string,
  afterId = 0,
): Promise<PublicMessage[]> =>
  event.locals.db
    .selectFrom("chat_messages")
    .select(MESSAGE_FIELDS)
    .where("conversation_id", "=", conversationId)
    .where("id", ">", afterId)
    .orderBy("id", "asc")
    .limit(200)
    .execute()
