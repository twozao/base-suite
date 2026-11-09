import { readFileSync } from "node:fs"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("$env/dynamic/private")
vi.mock("resend")

import { Resend } from "resend"
import { sendTemplatedEmail } from "$lib/mailer"
import { createTestDb } from "./db/test_db"
import { saveTemplate } from "./email"
import {
  installExtension,
  parseManifest,
  uninstallExtension,
} from "./plugins/extensions"

const PACKAGE = readFileSync("examples/extensions/emailer.json", "utf8")
const mockSend = vi.fn()

const send = (
  db: Awaited<ReturnType<typeof createTestDb>>,
  template: string,
  vars: Record<string, string> = {},
) =>
  sendTemplatedEmail({
    db,
    subject: "Caller subject",
    to_emails: ["a@example.com"],
    from_email: "site@example.com",
    template_name: template,
    template_properties: vars,
  })

describe("emailer", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockSend.mockResolvedValue({ data: { id: "re_123" }, error: null })
    const { env } = await import("$env/dynamic/private")
    env.PRIVATE_RESEND_API_KEY = "key"
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.mocked(Resend).mockImplementation(
      class {
        emails = { send: mockSend }
      } as unknown as typeof Resend,
    )
  })

  it("installs the example package, sends from it and logs the send", async () => {
    const db = await createTestDb()
    const m = parseManifest(PACKAGE)
    if ("error" in m) throw new Error(m.error)
    expect(await installExtension(db, m, null)).toEqual({ ok: true })
    const rows = await db
      .selectFrom("email_templates")
      .select(["slug", "extension_id"])
      .execute()
    expect(rows.map((r) => r.slug).sort()).toEqual([
      "announcement",
      "appointment_reminder",
      "event_invitation",
      "order_confirmation",
    ])
    expect(rows.every((r) => r.extension_id === "emailer")).toBe(true)

    const r = await send(db, "order_confirmation", {
      name: "<b>Sam</b>",
      orderNumber: "A-1",
      total: "$10",
    })
    expect(r.status).toBe("sent")
    const mail = mockSend.mock.calls[0][0]
    expect(mail.subject).toBe("Your order A-1 is confirmed")
    expect(mail.html).toContain("&lt;b&gt;Sam&lt;/b&gt;")
    expect(mail.html).not.toContain("<b>Sam</b>")
    expect(mail.text).toContain("Thanks, <b>Sam</b>")

    const log = await db.selectFrom("email_log").selectAll().execute()
    expect(log).toHaveLength(1)
    expect(log[0]).toMatchObject({
      template: "order_confirmation",
      status: "sent",
      provider_id: "re_123",
    })
    expect(log[0].body_text).toContain("A-1")

    await uninstallExtension(db, "emailer", false, null)
    expect(
      await db.selectFrom("email_templates").select("slug").execute(),
    ).toHaveLength(0)
  })

  it("refuses a package that changes the sign-in or reset emails", () => {
    const m = JSON.parse(PACKAGE)
    m.emailTemplates[0].slug = "reset_password"
    expect(parseManifest(JSON.stringify(m))).toHaveProperty("error")
  })

  it("uses an admin override of a built-in email and keeps the caller subject", async () => {
    const db = await createTestDb()
    await saveTemplate(
      db,
      {
        slug: "notice",
        name: "Notice",
        description: "",
        subject: "{{subject}} [custom]",
        html: "<p>{{heading}}</p>",
        text: "",
        variables: [],
      },
      null,
    )
    await send(db, "notice", { heading: "Hello" })
    const mail = mockSend.mock.calls[0][0]
    expect(mail.subject).toBe("Caller subject [custom]")
    expect(mail.html).toBe("<p>Hello</p>")
  })

  it("does not keep the body of reset emails, and logs failures", async () => {
    const db = await createTestDb()
    await send(db, "reset_password", { resetUrl: "https://x.test/secret" })
    mockSend.mockResolvedValueOnce({
      data: null,
      error: { message: "Domain not verified" },
    })
    await send(db, "notice", { heading: "x" })
    const log = await db
      .selectFrom("email_log")
      .selectAll()
      .orderBy("id")
      .execute()
    expect(log[0].body_text).toBeNull()
    expect(log[1]).toMatchObject({
      status: "failed",
      error: "Domain not verified",
    })
  })
})
