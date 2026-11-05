import { describe, it, expect } from "vitest"
import { createTestDb } from "../db/test_db"
import { appendMessage } from "./service"

describe("appendMessage", () => {
  it("keeps unread counters in step and re-opens a closed conversation on a visitor reply", async () => {
    const db = await createTestDb()
    await db
      .insertInto("chat_conversations")
      .values({
        id: "c1",
        visitor_token_hash: "h".repeat(64),
        status: "closed",
      })
      .execute()
    await appendMessage(db, "c1", "staff", "Hello", null)
    let c = await db
      .selectFrom("chat_conversations")
      .selectAll()
      .executeTakeFirstOrThrow()
    expect(c).toMatchObject({
      unread_by_staff: 0,
      unread_by_visitor: 1,
      status: "closed",
    })
    const m = await appendMessage(db, "c1", "visitor", "Hi back", null)
    expect(m).toMatchObject({ sender: "visitor", body: "Hi back" })
    c = await db
      .selectFrom("chat_conversations")
      .selectAll()
      .executeTakeFirstOrThrow()
    expect(c).toMatchObject({
      unread_by_staff: 1,
      unread_by_visitor: 1,
      status: "open",
    })
    expect(c.last_message_at).toBe(m.created_at)
  })
})
