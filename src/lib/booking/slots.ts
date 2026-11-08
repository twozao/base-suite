import { z } from "zod"
import {
  addDays,
  isValidTimeZone,
  localDate,
  weekdayOf,
  zonedToUtc,
} from "./time"

// Availability and the pure slot calculation. The calendar and the booking write both use
// computeSlots, so a time can only be booked if the calendar would have offered it.
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

const rangeSchema = z
  .object({
    start: z.string().regex(TIME, "Use HH:MM"),
    end: z.string().regex(TIME, "Use HH:MM"),
  })
  .refine((r) => r.start < r.end, "A range must end after it starts")

const rangesSchema = z
  .array(rangeSchema)
  .max(6)
  .refine((rs) => {
    const sorted = [...rs].sort((a, b) => a.start.localeCompare(b.start))
    return sorted.every((r, i) => i === 0 || sorted[i - 1].end <= r.start)
  }, "Time ranges on one day cannot overlap")

export const availabilitySchema = z.object({
  timezone: z.string().refine(isValidTimeZone, "Unknown time zone"),
  /** Index 0 is Sunday. */
  weekly: z.array(rangesSchema).length(7),
  /** A date with no ranges is a day off; with ranges it replaces that day's usual hours. */
  overrides: z
    .array(
      z.object({
        date: z.string().regex(DATE, "Use YYYY-MM-DD"),
        ranges: rangesSchema,
      }),
    )
    .max(200),
})
export type Availability = z.output<typeof availabilitySchema>

const workday = [{ start: "09:00", end: "17:00" }]
export const DEFAULT_AVAILABILITY: Availability = {
  timezone: "UTC",
  weekly: [[], workday, workday, workday, workday, workday, []],
  overrides: [],
}

export type SlotRule = {
  id?: string
  durationMinutes: number
  bufferBefore: number
  bufferAfter: number
  minNoticeMinutes: number
  maxDaysAhead: number
  slotInterval: number
  dailyLimit: number | null
}

export type Busy = {
  start: number
  end: number
  /** Which event type it belongs to, for that type's daily limit. */
  eventTypeId?: string | null
  startedAt?: number
}

const MIN = 60_000

/** The time the host is held by a meeting, buffers included. */
export const blockedWindow = (start: number, rule: SlotRule) => ({
  start: start - rule.bufferBefore * MIN,
  end: start + (rule.durationMinutes + rule.bufferAfter) * MIN,
})

/** Bookable start times, as ms since epoch, for host-zone dates from..to inclusive. */
export const computeSlots = (
  rule: SlotRule,
  availability: Availability,
  busy: Busy[],
  opts: { now: number; from: string; to: string },
): number[] => {
  const tz = availability.timezone
  const earliest = opts.now + rule.minNoticeMinutes * MIN
  const lastDate = addDays(localDate(opts.now, tz), rule.maxDaysAhead)
  const overrides = new Map(
    availability.overrides.map((o) => [o.date, o.ranges]),
  )
  const out: number[] = []

  for (
    let date = opts.from;
    date <= opts.to && date <= lastDate;
    date = addDays(date, 1)
  ) {
    if (rule.dailyLimit !== null) {
      const taken = busy.filter(
        (b) =>
          b.eventTypeId === rule.id &&
          b.startedAt !== undefined &&
          localDate(b.startedAt, tz) === date,
      ).length
      if (taken >= rule.dailyLimit) continue
    }
    const ranges = overrides.get(date) ?? availability.weekly[weekdayOf(date)]
    for (const range of ranges) {
      const rangeEnd = zonedToUtc(date, range.end, tz)
      for (
        let start = zonedToUtc(date, range.start, tz);
        start + rule.durationMinutes * MIN <= rangeEnd;
        start += rule.slotInterval * MIN
      ) {
        if (start < earliest) continue
        const w = blockedWindow(start, rule)
        if (!busy.some((b) => w.start < b.end && b.start < w.end))
          out.push(start)
      }
    }
  }
  return out
}
