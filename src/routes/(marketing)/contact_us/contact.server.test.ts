import { beforeEach, describe, expect, it, vi } from "vitest"
import { createTestDb } from "$lib/server/db/test_db"
import type { Db } from "$lib/server/db"
import {
  invalidateSettings,
  saveSetting,
  settingsSchema,
} from "$lib/server/settings"
import { actions } from "./+page.server"

const mail = vi.hoisted(() => ({ replies: [] as string[], admin: 0 }))
vi.mock("$lib/mailer", () => ({
  sendAdminEmail: vi.fn(async () => {
    mail.admin++
  }),
  sendTemplatedEmail: vi.fn(async (m: unknown) => {
    mail.replies.push(JSON.stringify(m))
  }),
}))
vi.mock("$env/dynamic/private", () => ({
  env: { PRIVATE_RESEND_API_KEY: "k", PRIVATE_FROM_EMAIL: "from@example.com" },
}))

let db: Db
let ip = 0
const submit = async (fields: Record<string, string>) => {
  const body = new FormData()
  for (const [k, v] of Object.entries(fields)) body.set(k, v)
  const address = `10.0.0.${++ip}`
  return (await actions.submitContactUs({
    request: new Request("https://s.test/contact_us", { method: "POST", body }),
    locals: { db, user: null },
    url: new URL("https://s.test/contact_us"),
    getClientAddress: () => address,
  } as never)) as {
    status?: number
    data?: { errors: Record<string, string>; values: Record<string, string> }
    success?: boolean
  }
}
const good = {
  name: "Ann Lee",
  email: "Ann@Example.com",
  topic: "Sales",
  message: "I would like to talk about a project.",
}
const rows = () => db.selectFrom("contact_requests").selectAll().execute()

beforeEach(async () => {
  invalidateSettings()
  mail.replies.length = 0
  mail.admin = 0
  db = await createTestDb()
})

describe("contact form", () => {
  it("saves a good message with its topic and sends the alert and auto-reply", async () => {
    expect((await submit(good)).success).toBe(true)
    const [r] = await rows()
    expect(r).toMatchObject({
      first_name: "Ann Lee",
      email: "ann@example.com",
      topic: "Sales",
      status: "new",
      preferred_contact: "email",
    })
    expect(mail.admin).toBe(1)
    expect(mail.replies).toHaveLength(1)
  })
  it("never repeats the typed message or name in the auto-reply", async () => {
    await submit({
      ...good,
      name: "Buy cheap pills",
      message: "Visit my totally legit offer today",
    })
    expect(mail.replies[0]).not.toContain("cheap pills")
    expect(mail.replies[0]).not.toContain("legit offer")
  })
  it("returns errors per field and keeps what was typed", async () => {
    const r = await submit({
      name: "",
      email: "nope",
      topic: "Not a topic",
      message: "short",
    })
    expect(r.status).toBe(400)
    expect(Object.keys(r.data!.errors).sort()).toEqual([
      "email",
      "message",
      "name",
      "topic",
    ])
    expect(r.data!.values.message).toBe("short")
    expect(await rows()).toEqual([])
  })
  it("requires a number when someone asks to be phoned", async () => {
    const r = await submit({ ...good, preferred_contact: "phone" })
    expect(r.data!.errors.phone).toBeTruthy()
    expect(
      (
        await submit({
          ...good,
          preferred_contact: "phone",
          phone: "+41 44 000 00 00",
        })
      ).success,
    ).toBe(true)
  })
  it("drops bots silently: honeypot and instant submits", async () => {
    expect((await submit({ ...good, website_url: "http://x" })).success).toBe(
      true,
    )
    expect(
      (await submit({ ...good, shown_at: String(Date.now()) })).success,
    ).toBe(true)
    expect(await rows()).toEqual([])
    expect(mail.replies).toEqual([])
    expect(
      (await submit({ ...good, shown_at: String(Date.now() - 60_000) }))
        .success,
    ).toBe(true)
    expect(await rows()).toHaveLength(1)
  })
  it("files link-stuffed messages under spam without alerting anyone", async () => {
    const message =
      "Great site http://a.test http://b.test http://c.test http://d.test"
    expect((await submit({ ...good, message })).success).toBe(true)
    expect((await rows())[0].status).toBe("spam")
    expect(mail.admin).toBe(0)
    expect(mail.replies).toEqual([])
  })
  it("skips the topic when none are configured and honours auto-reply off", async () => {
    const contact = settingsSchema.contact.parse({
      notifyAdmin: false,
      successMessage: "Thanks",
      topics: [],
      autoReply: false,
    })
    await saveSetting(db, "contact", contact, null)
    expect((await submit({ ...good, topic: "" })).success).toBe(true)
    expect(mail.replies).toEqual([])
    expect(mail.admin).toBe(0)
  })
  it("reads an older saved setting without the new fields", () => {
    const old = settingsSchema.contact.parse({
      notifyAdmin: true,
      successMessage: "Hi",
    })
    expect(old.topics.length).toBeGreaterThan(0)
    expect(old.successMessage).toBe("Hi")
  })
  it("ignores a from path pointing off the site", async () => {
    await submit({ ...good, from: "//evil.example/x" })
    expect((await rows())[0].source_path).toBeNull()
  })
})
