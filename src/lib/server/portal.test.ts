import { describe, it, expect } from "vitest"
import { createTestDb } from "./db/test_db"
import { createUser } from "./auth/users"
import { appendMessage } from "./chat/service"
import {
  userBookings,
  userConversation,
  userMessages,
  userSubscription,
  markReadByUser,
} from "./portal"

describe("customer portal reads", () => {
  it("only ever return the signed-in user's own rows", async () => {
    const db = await createTestDb()
    const a = (await createUser(db, {
      email: "a@example.com",
      password: "pw-pw-pw-pw",
    })) as { user: { id: string } }
    const b = (await createUser(db, {
      email: "b@example.com",
      password: "pw-pw-pw-pw",
    })) as { user: { id: string } }
    await db
      .insertInto("subscriptions")
      .values({
        id: "sub_b",
        user_id: b.user.id,
        stripe_customer_id: "cus_b",
        status: "active",
        cancel_at_period_end: 1,
      })
      .execute()
    await db
      .insertInto("bookings")
      .values({
        id: "bk_b",
        external_id: "ext_b",
        user_id: b.user.id,
        event_name: "Call",
        start_time: "2099-01-01T10:00:00.000Z",
      })
      .execute()
    await db
      .insertInto("chat_conversations")
      .values({ id: "conv_b", user_id: b.user.id })
      .execute()
    await appendMessage(db, "conv_b", "staff", "Hello B", null)

    expect(await userSubscription(db, a.user.id)).toBeNull()
    expect(await userSubscription(db, b.user.id)).toMatchObject({
      status: "active",
      cancel_at_period_end: true,
    })
    expect(await userBookings(db, a.user.id)).toEqual([])
    expect((await userBookings(db, b.user.id)).map((r) => r.id)).toEqual([
      "bk_b",
    ])
    expect(await userConversation(db, a.user.id)).toBeNull()
    expect((await userConversation(db, b.user.id))?.unread_by_visitor).toBe(1)
    expect(await userMessages(db, a.user.id, "conv_b")).toEqual([])
    expect(
      (await userMessages(db, b.user.id, "conv_b")).map((m) => m.body),
    ).toEqual(["Hello B"])
    await markReadByUser(db, a.user.id, "conv_b")
    expect((await userConversation(db, b.user.id))?.unread_by_visitor).toBe(1)
    await markReadByUser(db, b.user.id, "conv_b")
    expect((await userConversation(db, b.user.id))?.unread_by_visitor).toBe(0)
  })
})
