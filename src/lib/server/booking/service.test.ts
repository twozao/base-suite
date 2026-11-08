import { beforeEach, describe, expect, it, vi } from "vitest"
import { sql } from "kysely"
import { Migrator } from "kysely/migration"
import { migrateToLatest, type Db } from "../db"
import { openDb } from "../db/node"
import { migrations } from "../db/migrations"
import { createTestDb } from "../db/test_db"
import { invalidateSettings } from "../settings"
import type { Availability } from "$lib/booking/slots"
import {
  eventTypeBySlug,
  parseAnswers,
  toRow,
  type EventType,
  type EventTypeInput,
} from "./event_types"
import { sendDueReminders } from "./notify"
import {
  availableSlots,
  cancelBooking,
  createBooking,
  findManagedBooking,
  MAX_UPCOMING_PER_EMAIL,
  rescheduleBooking,
} from "./service"

const mail = vi.hoisted(() => ({
  sent: [] as { to: string[]; subject: string }[],
}))
vi.mock("$lib/mailer", () => ({
  sendAdminEmail: vi.fn(),
  sendTemplatedEmail: vi.fn(
    async (m: { to_emails: string[]; subject: string }) => {
      mail.sent.push({ to: m.to_emails, subject: m.subject })
    },
  ),
}))
vi.mock("$env/dynamic/private", () => ({
  env: { PRIVATE_RESEND_API_KEY: "k", PRIVATE_FROM_EMAIL: "from@example.com" },
}))

const NOW = Date.parse("2026-11-01T00:00:00Z")
const at = (hm: string, date = "2026-11-02") => Date.parse(`${date}T${hm}:00Z`)
const nineToEleven = [{ start: "09:00", end: "11:00" }]
const availability: Availability = {
  timezone: "UTC",
  weekly: [
    [],
    nineToEleven,
    nineToEleven,
    nineToEleven,
    nineToEleven,
    nineToEleven,
    [],
  ],
  overrides: [],
}
const input: EventTypeInput = {
  name: "Call",
  slug: "call",
  description: "",
  durationMinutes: 30,
  locationKind: "video",
  locationDetail: "https://meet.example/x",
  bufferBefore: 0,
  bufferAfter: 0,
  minNoticeMinutes: 0,
  maxDaysAhead: 60,
  slotInterval: 30,
  dailyLimit: null,
  active: true,
  questions: [],
}

let db: Db
let type: EventType
const makeType = async (over: Partial<EventTypeInput> = {}) => {
  const t = { ...input, ...over }
  await db
    .insertInto("booking_event_types")
    .values({ id: crypto.randomUUID(), ...toRow(t) })
    .execute()
  return (await eventTypeBySlug(db, t.slug))!
}
const person = (email = "a@example.com") => ({
  name: "Ann",
  email,
  phone: null,
  timezone: "Asia/Tokyo",
  answers: [],
  userId: null,
})
const book = (start: number, email?: string, t = type) =>
  createBooking(db, t, availability, { ...person(email), start, now: NOW })

beforeEach(async () => {
  invalidateSettings()
  mail.sent.length = 0
  db = await createTestDb()
  type = await makeType()
})

describe("booking", () => {
  it("creates a meeting and takes the time off the calendar", async () => {
    const r = await book(at("09:00"))
    expect(r.ok).toBe(true)
    const left = await availableSlots(db, type, availability, {
      from: "2026-11-02",
      to: "2026-11-02",
      now: NOW,
    })
    expect(left).not.toContain(at("09:00"))
    expect(left).toContain(at("09:30"))
    const row = await db
      .selectFrom("bookings")
      .selectAll()
      .executeTakeFirstOrThrow()
    expect(row).toMatchObject({
      provider: "native",
      invitee_email: "a@example.com",
      location: "https://meet.example/x",
    })
    expect(row.manage_token_hash).not.toBe((r as { token: string }).token)
  })
  it("refuses a time the calendar would not offer", async () => {
    expect(await book(at("09:10"))).toEqual({ ok: false, reason: "taken" })
    expect(await book(at("12:00"))).toEqual({ ok: false, reason: "taken" })
    expect(await book(at("09:00", "2026-11-01"))).toEqual({
      ok: false,
      reason: "taken",
    })
  })
  it("gives a contested time to exactly one of many simultaneous requests", async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        book(at("09:00"), `p${i}@example.com`),
      ),
    )
    expect(results.filter((r) => r.ok)).toHaveLength(1)
    const { n } = await db
      .selectFrom("bookings")
      .select(db.fn.countAll<number>().as("n"))
      .executeTakeFirstOrThrow()
    expect(Number(n)).toBe(1)
  })
  it("keeps buffers around meetings across event types", async () => {
    const buffered = await makeType({ slug: "buffered", bufferAfter: 30 })
    expect((await book(at("09:00"), undefined, buffered)).ok).toBe(true)
    expect(await book(at("09:30"))).toEqual({ ok: false, reason: "taken" })
    expect((await book(at("10:00"))).ok).toBe(true)
  })
  it("limits upcoming meetings per email, ignoring case", async () => {
    const wide: Availability = {
      ...availability,
      weekly: Array(7).fill([{ start: "09:00", end: "17:00" }]),
    }
    for (let i = 0; i < MAX_UPCOMING_PER_EMAIL; i++) {
      const r = await createBooking(db, type, wide, {
        ...person("Same@Example.com"),
        start: at("09:00") + i * 3_600_000,
        now: NOW,
      })
      expect(r.ok).toBe(true)
    }
    const over = await createBooking(db, type, wide, {
      ...person("same@example.com"),
      start: at("15:00"),
      now: NOW,
    })
    expect(over).toEqual({ ok: false, reason: "limit" })
  })
  it("counts Calendly meetings as busy", async () => {
    await db
      .insertInto("bookings")
      .values({
        id: "c1",
        external_id: "https://api.calendly.com/x",
        start_time: new Date(at("09:00")).toISOString(),
        end_time: new Date(at("09:30")).toISOString(),
      })
      .execute()
    expect(await book(at("09:00"))).toEqual({ ok: false, reason: "taken" })
  })
})

describe("rescheduling and cancelling", () => {
  const first = async () => {
    const r = await book(at("09:00"))
    if (!r.ok) throw new Error(r.reason)
    return r
  }
  it("moves a meeting, frees the old time and lets it move within its own buffer", async () => {
    const r = await first()
    const moved = await rescheduleBooking(db, r.id, type, availability, {
      start: at("09:30"),
      now: NOW,
    })
    expect(moved).toMatchObject({ ok: true, sequence: 1 })
    expect((await book(at("09:00"), "b@example.com")).ok).toBe(true)
  })
  it("refuses a taken time, and a cancelled or past meeting", async () => {
    const r = await first()
    await book(at("10:00"), "b@example.com")
    expect(
      await rescheduleBooking(db, r.id, type, availability, {
        start: at("10:00"),
        now: NOW,
      }),
    ).toEqual({ ok: false, reason: "taken" })
    await cancelBooking(db, r.id, null)
    expect(
      await rescheduleBooking(db, r.id, type, availability, {
        start: at("09:30"),
        now: NOW,
      }),
    ).toEqual({ ok: false, reason: "closed" })
    const again = await book(at("09:30"), "c@example.com")
    if (!again.ok) throw new Error(again.reason)
    expect(
      await rescheduleBooking(db, again.id, type, availability, {
        start: at("10:30"),
        now: at("23:00", "2026-11-03"),
      }),
    ).toEqual({ ok: false, reason: "closed" })
  })
  it("cancels once and frees the time", async () => {
    const r = await first()
    expect(await cancelBooking(db, r.id, "changed my mind")).toBe(true)
    expect(await cancelBooking(db, r.id, null)).toBe(false)
    expect((await book(at("09:00"), "b@example.com")).ok).toBe(true)
  })
})

describe("who can open a booking", () => {
  it("allows the emailed link, the owner and staff, nobody else", async () => {
    const r = await createBooking(db, type, availability, {
      ...person(),
      userId: null,
      start: at("09:00"),
      now: NOW,
    })
    if (!r.ok) throw new Error(r.reason)
    expect((await findManagedBooking(db, r.token, {}))?.id).toBe(r.id)
    expect(await findManagedBooking(db, r.id, {})).toBeNull()
    expect(
      await findManagedBooking(db, r.id, { userId: "stranger" }),
    ).toBeNull()
    expect(
      (await findManagedBooking(db, r.id, { userId: "s", isStaff: true }))?.id,
    ).toBe(r.id)
    expect(await findManagedBooking(db, "wrong-token", {})).toBeNull()
  })
})

describe("answers", () => {
  const qs = [
    {
      id: "a",
      label: "Topic",
      kind: "select" as const,
      required: true,
      options: ["X", "Y"],
    },
    {
      id: "b",
      label: "More",
      kind: "text" as const,
      required: false,
      options: [],
    },
  ]
  it("requires required answers and only allows listed options", () => {
    expect(parseAnswers(qs, () => "")).toMatchObject({
      ok: false,
      field: "q_a",
    })
    expect(parseAnswers(qs, (id) => (id === "a" ? "Z" : ""))).toMatchObject({
      ok: false,
      field: "q_a",
    })
    expect(parseAnswers(qs, (id) => (id === "a" ? "X" : ""))).toEqual({
      ok: true,
      answers: [{ label: "Topic", value: "X" }],
    })
  })
})

describe("reminders", () => {
  it("sends once for meetings inside the window, and again after a move", async () => {
    const soon = at("09:00")
    const r = await createBooking(db, type, availability, {
      ...person(),
      start: soon,
      now: NOW,
    })
    if (!r.ok) throw new Error(r.reason)
    expect(await sendDueReminders(db, soon - 48 * 3_600_000)).toBe(0)
    const inWindow = soon - 3_600_000
    expect(await sendDueReminders(db, inWindow)).toBe(1)
    expect(await sendDueReminders(db, inWindow)).toBe(0)
    expect(mail.sent).toEqual([
      { to: ["a@example.com"], subject: "Reminder: Call" },
    ])
    await rescheduleBooking(db, r.id, type, availability, {
      start: at("10:00"),
      now: NOW,
    })
    expect(await sendDueReminders(db, inWindow)).toBe(1)
  })
  it("skips cancelled meetings", async () => {
    const r = await book(at("09:00"))
    if (!r.ok) throw new Error(r.reason)
    await cancelBooking(db, r.id, null)
    expect(await sendDueReminders(db, at("08:00"))).toBe(0)
  })
})

describe("upgrading an existing database", () => {
  it("keeps Calendly bookings through the table rebuild", async () => {
    const url = process.env.TEST_DATABASE_URL ?? ":memory:"
    const { db: old, dialect } = openDb(url)
    if (dialect === "postgres") {
      await sql`drop schema public cascade`.execute(old)
      await sql`create schema public`.execute(old)
    }
    const migrator = new Migrator({
      db: old,
      provider: {
        getMigrations: async () =>
          Object.fromEntries(
            Object.entries(migrations).map(([n, make]) => [n, make(dialect)]),
          ),
      },
    })
    const step = await migrator.migrateTo("0002_oauth_accounts")
    expect(step.error).toBeUndefined()
    await sql`insert into bookings (id, external_id, event_name, start_time, status)
      values ('old-1', 'https://api.calendly.com/old', 'Old call', '2026-01-01T10:00:00.000Z', 'canceled')`.execute(
      old,
    )
    await migrateToLatest(old, dialect)
    const row = await old
      .selectFrom("bookings")
      .selectAll()
      .where("id", "=", "old-1")
      .executeTakeFirstOrThrow()
    expect(row).toMatchObject({
      provider: "calendly",
      event_name: "Old call",
      status: "canceled",
      sequence: 0,
      answers: "[]",
    })
    await old.destroy()
  })
})
