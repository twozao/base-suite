import type { Db } from "./db"
import { nowIso } from "./db/json"

// Customer portal reads. Every query takes the signed-in user's id, so a page can only ever show
// that user's own rows; this replaces the row level security the Supabase version relied on.

const ACTIVE = ["active", "trialing", "past_due"]

export const userSubscription = async (db: Db, userId: string) => {
  const row = await db
    .selectFrom("subscriptions")
    .select(["status", "current_period_end", "cancel_at_period_end"])
    .where("user_id", "=", userId)
    .where("status", "in", ACTIVE)
    .orderBy("updated_at", "desc")
    .executeTakeFirst()
  return row
    ? { ...row, cancel_at_period_end: row.cancel_at_period_end === 1 }
    : null
}

export const userUpcomingBookings = (db: Db, userId: string, limit = 3) =>
  db
    .selectFrom("bookings")
    .select(["id", "event_name", "start_time", "reschedule_url", "cancel_url"])
    .where("user_id", "=", userId)
    .where("status", "=", "scheduled")
    .where("start_time", ">=", nowIso())
    .orderBy("start_time", "asc")
    .limit(limit)
    .execute()

export const userBookings = (db: Db, userId: string) =>
  db
    .selectFrom("bookings")
    .select([
      "id",
      "event_name",
      "start_time",
      "end_time",
      "status",
      "cancel_reason",
      "reschedule_url",
      "cancel_url",
    ])
    .where("user_id", "=", userId)
    .orderBy("start_time", "desc")
    .limit(100)
    .execute()

export const userConversation = async (db: Db, userId: string) => {
  const row = await db
    .selectFrom("chat_conversations")
    .select([
      "id",
      "status",
      "created_at",
      "unread_by_visitor",
      "last_message_at",
    ])
    .where("user_id", "=", userId)
    .orderBy("last_message_at", "desc")
    .executeTakeFirst()
  return row ?? null
}

/** Messages of one of the user's conversations; another user's conversation id yields nothing. */
export const userMessages = (db: Db, userId: string, conversationId: string) =>
  db
    .selectFrom("chat_messages")
    .innerJoin(
      "chat_conversations",
      "chat_conversations.id",
      "chat_messages.conversation_id",
    )
    .select([
      "chat_messages.id",
      "chat_messages.sender",
      "chat_messages.body",
      "chat_messages.created_at",
    ])
    .where("chat_conversations.user_id", "=", userId)
    .where("chat_messages.conversation_id", "=", conversationId)
    .orderBy("chat_messages.id", "asc")
    .limit(500)
    .execute()

export const markReadByUser = (
  db: Db,
  userId: string,
  conversationId: string,
) =>
  db
    .updateTable("chat_conversations")
    .set({ unread_by_visitor: 0 })
    .where("id", "=", conversationId)
    .where("user_id", "=", userId)
    .execute()
