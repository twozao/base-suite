import { vi, describe, it, expect, beforeEach } from "vitest"

vi.mock("$env/dynamic/private")
vi.mock("resend")

import type { SupabaseClient, User } from "@supabase/supabase-js"
import { Resend } from "resend"
import * as mailer from "./mailer"

describe("mailer", () => {
  const mockSend = vi.fn().mockResolvedValue({ id: "mock-email-id" })

  const mockSupabaseClient = {
    auth: {
      admin: {
        getUserById: vi.fn(),
      },
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  }

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

  describe("sendUserEmail", () => {
    const mockUser = { id: "user123", email: "user@example.com" }

    it("sends welcome email", async () => {
      mockSupabaseClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: { email_confirmed_at: new Date().toISOString() } },
        error: null,
      })

      mockSupabaseClient.single.mockResolvedValue({
        data: { unsubscribed: false },
        error: null,
      })

      await mailer.sendUserEmail({
        db: mockSupabaseClient as unknown as SupabaseClient,
        user: mockUser as User,
        subject: "Test",
        from_email: "test@example.com",
        template_name: "welcome_email",
        template_properties: {
          companyName: "Test Company",
          WebsiteBaseUrl: "https://test.com",
        },
      })

      expect(mockSend).toHaveBeenCalled()
      const email = mockSend.mock.calls[0][0]
      expect(email.to).toEqual(["user@example.com"])
    })

    it("should not send email if user is unsubscribed", async () => {
      mockSupabaseClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: { email_confirmed_at: new Date().toISOString() } },
        error: null,
      })

      mockSupabaseClient.single.mockResolvedValue({
        data: { unsubscribed: true },
        error: null,
      })

      await mailer.sendUserEmail({
        db: mockSupabaseClient as unknown as SupabaseClient,
        user: mockUser as User,
        subject: "Test",
        from_email: "test@example.com",
        template_name: "welcome_email",
        template_properties: {},
      })

      expect(mockSend).not.toHaveBeenCalled()
    })
  })

  describe("sendTemplatedEmail", () => {
    it("sends templated email", async () => {
      await mailer.sendTemplatedEmail({
        subject: "Test subject",
        from_email: "from@example.com",
        to_emails: ["to@example.com"],
        template_name: "welcome_email",
        template_properties: {
          companyName: "Test Company",
          WebsiteBaseUrl: "https://test.com",
        },
      })

      expect(mockSend).toHaveBeenCalled()
      const email = mockSend.mock.calls[0][0]
      expect(email.from).toEqual("from@example.com")
      expect(email.to).toEqual(["to@example.com"])
      expect(email.subject).toEqual("Test subject")
      expect(email.text).toContain("This is a quick sample of a welcome email")
      expect(email.html).toContain("This is a quick sample of a welcome email")
      expect(email.html).toContain("<html")
      expect(email.html).toContain("https://test.com")
      expect(email.html).toContain("Test Company")
      expect(email.text).toContain("https://test.com")
      expect(email.text).toContain("Test Company")
    })
  })
})
