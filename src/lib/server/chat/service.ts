import { z } from "zod"
import type { RequestEvent } from "@sveltejs/kit"
import type { ChatMessageRow } from "../../../DatabaseDefinitions"
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

const MESSAGE_FIELDS = "id, sender, body, created_at"

/** Find the caller's conversation: by account if signed in, else by cookie. */
export const findConversation = async (event: RequestEvent) => {
  const db = event.locals.supabaseServiceRole
  const user = event.locals.user
  if (user) {
    const { data } = await db
      .from("chat_conversations")
      .select("id, status")
      .eq("user_id", user.id)
      .order("last_message_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    return data
  }
  const token = event.cookies.get(CHAT_COOKIE)
  if (!token || token.length > 100) return null
  const { data } = await db
    .from("chat_conversations")
    .select("id, status")
    .eq("visitor_token_hash", await sha256Hex(token))
    .maybeSingle()
  return data
}

export const startConversation = async (
  event: RequestEvent,
  input: { name?: string; email?: string; pageUrl?: string },
) => {
  const db = event.locals.supabaseServiceRole
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

  const { data, error } = await db
    .from("chat_conversations")
    .insert({
      user_id: user?.id ?? null,
      visitor_token_hash: tokenHash,
      visitor_name: input.name || null,
      visitor_email: user?.email ?? (input.email || null),
      page_url: pageUrl,
    })
    .select("id, status")
    .single()
  if (error || !data) throw new Error(`Could not start chat: ${error?.message}`)

  if (token) {
    event.cookies.set(CHAT_COOKIE, token, {
      path: "/api/chat",
      httpOnly: true,
      sameSite: "strict",
      secure: event.url.protocol === "https:",
      maxAge: COOKIE_MAX_AGE,
    })
  }
  return data
}

export const addMessage = async (
  event: RequestEvent,
  conversationId: string,
  sender: "visitor" | "staff" | "system",
  body: string,
) => {
  const { data, error } = await event.locals.supabaseServiceRole
    .from("chat_messages")
    .insert({
      conversation_id: conversationId,
      sender,
      body,
      author_id: sender === "system" ? null : (event.locals.user?.id ?? null),
    })
    .select(MESSAGE_FIELDS)
    .single()
  if (error) throw new Error(`Could not send message: ${error.message}`)
  return data as PublicMessage
}

export const listMessages = async (
  event: RequestEvent,
  conversationId: string,
  afterId = 0,
): Promise<PublicMessage[]> => {
  const { data, error } = await event.locals.supabaseServiceRole
    .from("chat_messages")
    .select(MESSAGE_FIELDS)
    .eq("conversation_id", conversationId)
    .gt("id", afterId)
    .order("id", { ascending: true })
    .limit(200)
  if (error) throw new Error(error.message)
  return (data ?? []) as PublicMessage[]
}
