import { vi, describe, it, expect, beforeEach } from "vitest"

vi.mock("$env/dynamic/private")
vi.mock("resend")

import { Resend } from "resend"
import * as mailer from "./mailer"
import { createTestDb } from "./server/db/test_db"
import { createUser, markEmailVerified } from "./server/auth/users"

describe("mailer", () => {
  const mockSend = vi.fn().mockResolvedValue({ id: "mock-email-id" })

  beforeEach(async () => {
    vi.clearAllMocks()
    const { env } = await import("$env/dynamic/private")
    env.PRIVATE_RESEND_API_KEY = "mock_resend_api_key"
    vi.spyOn(console, "error").mockImplementation(() => {})
    // vitest 4 calls class mocks with new, so the implementation must be constructable
    vi.mocked(Resend).mockImplementation(
      class {
        emails = { send: mockSend }
      } as unknown as typeof Resend,
    )
  })

  const send = (db: Awaited<ReturnType<typeof createTestDb>>, userId: string) =>
    mailer.sendUserEmail({
      db,
      userId,
      subject: "Test",
      from_email: "test@example.com",
      template_name: "welcome_email",
      template_properties: {
        companyName: "Test Company",
        WebsiteBaseUrl: "https://test.com",
      },
    })

  it("sends to a verified, subscribed user", async () => {
    const db = await createTestDb()
    const r = await createUser(db, {
      email: "user@example.com",
      password: "pw-pw-pw",
    })
    const id = (r as { user: { id: string } }).user.id
    await markEmailVerified(db, id)
    await send(db, id)
    expect(mockSend).toHaveBeenCalledTimes(1)
    const email = mockSend.mock.calls[0][0]
    expect(email.to).toEqual(["user@example.com"])
    expect(email.subject).toBe("Test")
    expect(email.html).toContain("Test Company")
  })

  it("does not send to an unverified address or an unsubscribed user", async () => {
    const db = await createTestDb()
    const r = await createUser(db, {
      email: "user@example.com",
      password: "pw-pw-pw",
    })
    const id = (r as { user: { id: string } }).user.id
    await send(db, id)
    expect(mockSend).not.toHaveBeenCalled()
    await markEmailVerified(db, id)
    await db
      .updateTable("profiles")
      .set({ unsubscribed: 1 })
      .where("id", "=", id)
      .execute()
    await send(db, id)
    expect(mockSend).not.toHaveBeenCalled()
  })

  it("sendTemplatedEmail does nothing without a provider key", async () => {
    const { env } = await import("$env/dynamic/private")
    env.PRIVATE_RESEND_API_KEY = ""
    await mailer.sendTemplatedEmail({
      subject: "x",
      to_emails: ["a@example.com"],
      from_email: "b@example.com",
      template_name: "welcome_email",
      template_properties: {},
    })
    expect(mockSend).not.toHaveBeenCalled()
  })
})
