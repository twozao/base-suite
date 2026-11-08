import { describe, expect, it } from "vitest"
import { buildIcs, googleCalendarUrl } from "./ics"
import {
  availabilitySchema,
  computeSlots,
  DEFAULT_AVAILABILITY,
  type Availability,
  type SlotRule,
} from "./slots"
import { addDays, localDate, weekdayOf, zonedToUtc } from "./time"

const iso = (ms: number) => new Date(ms).toISOString()

describe("time zones", () => {
  it("converts wall time to UTC either side of a clock change", () => {
    expect(iso(zonedToUtc("2026-07-01", "09:00", "Europe/Zurich"))).toBe(
      "2026-07-01T07:00:00.000Z",
    )
    expect(iso(zonedToUtc("2026-12-01", "09:00", "Europe/Zurich"))).toBe(
      "2026-12-01T08:00:00.000Z",
    )
    expect(iso(zonedToUtc("2026-07-01", "09:00", "Asia/Kolkata"))).toBe(
      "2026-07-01T03:30:00.000Z",
    )
  })
  it("moves a time skipped by the spring clock change forward, not back", () => {
    const t = zonedToUtc("2026-03-08", "02:30", "America/New_York")
    expect(t).toBeGreaterThanOrEqual(Date.parse("2026-03-08T07:00:00Z"))
    expect(t).toBeLessThanOrEqual(Date.parse("2026-03-08T07:30:00Z"))
  })
  it("gives the local date across midnight", () => {
    const ms = Date.parse("2026-07-01T20:00:00Z")
    expect(localDate(ms, "Asia/Tokyo")).toBe("2026-07-02")
    expect(localDate(ms, "America/New_York")).toBe("2026-07-01")
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01")
    expect(weekdayOf("2026-11-04")).toBe(3)
  })
})

const rule: SlotRule = {
  id: "t1",
  durationMinutes: 30,
  bufferBefore: 0,
  bufferAfter: 0,
  minNoticeMinutes: 0,
  maxDaysAhead: 365,
  slotInterval: 30,
  dailyLimit: null,
}
const nineToEleven = [{ start: "09:00", end: "11:00" }]
const avail: Availability = {
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
const NOW = Date.parse("2026-11-01T00:00:00Z")
const MONDAY = "2026-11-02"
const at = (hm: string, date = MONDAY) => Date.parse(`${date}T${hm}:00Z`)
const slots = (
  r: Partial<SlotRule> = {},
  a = avail,
  busy: Parameters<typeof computeSlots>[2] = [],
  date = MONDAY,
  now = NOW,
) =>
  computeSlots({ ...rule, ...r }, a, busy, { now, from: date, to: date }).map(
    (m) => iso(m).slice(11, 16),
  )

describe("slot calculation", () => {
  it("offers start times that fit inside the hours", () => {
    expect(slots()).toEqual(["09:00", "09:30", "10:00", "10:30"])
    expect(slots({ durationMinutes: 60 })).toEqual(["09:00", "09:30", "10:00"])
    expect(slots({ slotInterval: 60 })).toEqual(["09:00", "10:00"])
  })
  it("offers nothing on a day with no hours", () => {
    expect(slots({}, avail, [], "2026-11-01")).toEqual([])
  })
  it("treats an override as a day off or as replacement hours", () => {
    const off = { ...avail, overrides: [{ date: MONDAY, ranges: [] }] }
    expect(slots({}, off)).toEqual([])
    const late = {
      ...avail,
      overrides: [{ date: MONDAY, ranges: [{ start: "15:00", end: "16:00" }] }],
    }
    expect(slots({}, late)).toEqual(["15:00", "15:30"])
  })
  it("respects minimum notice and the booking window", () => {
    expect(
      slots({ minNoticeMinutes: 60 }, avail, [], MONDAY, at("08:45")),
    ).toEqual(["10:00", "10:30"])
    expect(slots({ maxDaysAhead: 0 })).toEqual([])
  })
  it("removes times overlapping a meeting, including both sets of buffers", () => {
    const busy = [{ start: at("09:30"), end: at("10:00") }]
    expect(slots({}, avail, busy)).toEqual(["09:00", "10:00", "10:30"])
    expect(slots({ bufferAfter: 15 }, avail, busy)).toEqual(["10:00", "10:30"])
    expect(slots({ bufferBefore: 15 }, avail, busy)).toEqual(["09:00", "10:30"])
  })
  it("stops offering a day at the daily limit, counting only that event type", () => {
    const mine = {
      start: at("09:00"),
      end: at("09:30"),
      eventTypeId: "t1",
      startedAt: at("09:00"),
    }
    expect(slots({ dailyLimit: 1 }, avail, [mine])).toEqual([])
    expect(
      slots({ dailyLimit: 1 }, avail, [{ ...mine, eventTypeId: "other" }]),
    ).toEqual(["09:30", "10:00", "10:30"])
  })
  it("keeps the same wall hours on the day clocks change", () => {
    const zurich = {
      ...avail,
      timezone: "Europe/Zurich",
      weekly: Array(7).fill(nineToEleven),
    }
    // Clocks went back on 25 Oct 2026; 9am is 08:00Z that day and 07:00Z the day before.
    expect(
      slots(
        {},
        zurich,
        [],
        "2026-10-25",
        Date.parse("2026-10-01T00:00:00Z"),
      )[0],
    ).toBe("08:00")
    expect(
      slots(
        {},
        zurich,
        [],
        "2026-10-24",
        Date.parse("2026-10-01T00:00:00Z"),
      )[0],
    ).toBe("07:00")
  })
})

describe("availability rules", () => {
  it("accepts the default and refuses bad schedules", () => {
    expect(availabilitySchema.safeParse(DEFAULT_AVAILABILITY).success).toBe(
      true,
    )
    const w = (rs: { start: string; end: string }[]) => ({
      ...DEFAULT_AVAILABILITY,
      weekly: Array(7).fill(rs),
    })
    expect(
      availabilitySchema.safeParse(w([{ start: "10:00", end: "09:00" }]))
        .success,
    ).toBe(false)
    expect(
      availabilitySchema.safeParse(
        w([
          { start: "09:00", end: "12:00" },
          { start: "11:00", end: "13:00" },
        ]),
      ).success,
    ).toBe(false)
    expect(
      availabilitySchema.safeParse({
        ...DEFAULT_AVAILABILITY,
        timezone: "Mars/Base",
      }).success,
    ).toBe(false)
  })
})

describe("calendar invites", () => {
  const e = {
    uid: "u1@x",
    title: "Call, with; us",
    start: "2026-11-02T09:00:00.000Z",
    end: "2026-11-02T09:30:00.000Z",
    location: "Line one\nLine two",
    now: "2026-11-01T00:00:00.000Z",
  }
  it("writes a valid event with escaped text and CRLF line ends", () => {
    const ics = buildIcs(e)
    expect(ics).toContain("DTSTART:20261102T090000Z\r\n")
    expect(ics).toContain("SUMMARY:Call\\, with\\; us\r\n")
    expect(ics).toContain("LOCATION:Line one\\nLine two\r\n")
    expect(ics.split("\r\n").every((l) => l.length <= 75)).toBe(true)
  })
  it("marks a cancellation and bumps the sequence", () => {
    const ics = buildIcs({ ...e, canceled: true, sequence: 2 })
    expect(ics).toContain("METHOD:CANCEL")
    expect(ics).toContain("STATUS:CANCELLED")
    expect(ics).toContain("SEQUENCE:2")
  })
  it("folds long lines", () => {
    const ics = buildIcs({ ...e, title: "x".repeat(200) })
    expect(ics.split("\r\n").every((l) => l.length <= 75)).toBe(true)
    expect(ics.replace(/\r\n /g, "")).toContain(`SUMMARY:${"x".repeat(200)}`)
  })
  it("links to Google Calendar", () => {
    const u = new URL(googleCalendarUrl(e))
    expect(u.host).toBe("calendar.google.com")
    expect(u.searchParams.get("dates")).toBe(
      "20261102T090000Z/20261102T093000Z",
    )
  })
})
