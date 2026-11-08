import type { Db } from "../db"
import { nowIso } from "../db/json"
import { randomToken, sha256Hex } from "../security/crypto"
import {
  blockedWindow,
  computeSlots,
  type Availability,
  type Busy,
} from "$lib/booking/slots"
import { addDays, localDate } from "$lib/booking/time"
import { LOCATION_LABELS, slotRule, type EventType } from "./event_types"

const DAY = 86_400_000

/**
 * True when the slot is still free once this booking is written. On D1 there are no transactions, so two
 * people can pass the first check together; both then see the clash here and step back to pick again.
 */
const stillFree = async (
  db: Db,
  type: EventType,
  availability: Availability,
  start: number,
  now: number,
  ownId: string,
) => {
  const date = localDate(start, availability.timezone)
  const busy = await loadBusy(db, start - DAY, start + DAY, ownId)
  return computeSlots(slotRule(type), availability, busy, {
    now,
    from: date,
    to: date,
  }).includes(start)
}
/** Upcoming meetings one address can hold, so a script cannot fill the calendar. */
export const MAX_UPCOMING_PER_EMAIL = 5

const loadBusy = async (
  db: Db,
  fromMs: number,
  toMs: number,
  excludeId?: string,
) => {
  let q = db
    .selectFrom("bookings")
    .select([
      "id",
      "start_time",
      "end_time",
      "block_start",
      "block_end",
      "event_type_id",
    ])
    .where("status", "=", "scheduled")
    .where("start_time", ">=", new Date(fromMs - DAY).toISOString())
    .where("start_time", "<=", new Date(toMs + DAY).toISOString())
  if (excludeId) q = q.where("id", "!=", excludeId)
  const rows = await q.execute()
  const busy: Busy[] = []
  for (const r of rows) {
    if (!r.start_time || !r.end_time) continue
    busy.push({
      start: Date.parse(r.block_start ?? r.start_time),
      end: Date.parse(r.block_end ?? r.end_time),
      eventTypeId: r.event_type_id,
      startedAt: Date.parse(r.start_time),
    })
  }
  return busy
}

/** Free start times for host-zone dates from..to. `excludeBookingId` is the meeting being moved. */
export const availableSlots = async (
  db: Db,
  type: EventType,
  availability: Availability,
  range: { from: string; to: string; now?: number; excludeBookingId?: string },
) => {
  const now = range.now ?? Date.now()
  const fromMs = Date.parse(`${range.from}T00:00:00Z`)
  const toMs = Date.parse(`${range.to}T23:59:59Z`)
  const busy = await loadBusy(db, fromMs, toMs, range.excludeBookingId)
  return computeSlots(slotRule(type), availability, busy, {
    now,
    from: range.from,
    to: range.to,
  })
}

export type Invitee = {
  name: string
  email: string
  phone: string | null
  timezone: string
  answers: { label: string; value: string }[]
  userId: string | null
}
export type BookResult =
  | { ok: true; id: string; token: string; start: string; end: string }
  | { ok: false; reason: "taken" | "limit" }

const locationText = (t: EventType) =>
  t.locationDetail || LOCATION_LABELS[t.locationKind]

/** The re-check and insert run inside one locked transaction, so two visitors cannot take one slot. */
export const createBooking = async (
  db: Db,
  type: EventType,
  availability: Availability,
  input: Invitee & { start: number; now?: number },
): Promise<BookResult> => {
  const now = input.now ?? Date.now()
  const email = input.email.trim().toLowerCase()
  const token = randomToken()
  const manage_token_hash = await sha256Hex(token)
  const id = crypto.randomUUID()
  const date = localDate(input.start, availability.timezone)
  const start = new Date(input.start).toISOString()
  const end = new Date(
    input.start + type.durationMinutes * 60_000,
  ).toISOString()
  const w = blockedWindow(input.start, slotRule(type))

  return db.transaction().execute(async (trx) => {
    await trx
      .updateTable("booking_lock")
      .set({ touched_at: nowIso() })
      .execute()
    const busy = await loadBusy(trx, input.start - DAY, input.start + DAY)
    const free = computeSlots(slotRule(type), availability, busy, {
      now,
      from: date,
      to: date,
    })
    if (!free.includes(input.start))
      return { ok: false, reason: "taken" } as const
    const { n } = await trx
      .selectFrom("bookings")
      .select(trx.fn.countAll<number>().as("n"))
      .where("invitee_email", "=", email)
      .where("status", "=", "scheduled")
      .where("start_time", ">=", new Date(now).toISOString())
      .executeTakeFirstOrThrow()
    if (Number(n) >= MAX_UPCOMING_PER_EMAIL)
      return { ok: false, reason: "limit" } as const
    await trx
      .insertInto("bookings")
      .values({
        id,
        provider: "native",
        external_id: `native:${id}`,
        event_type_id: type.id,
        event_name: type.name,
        invitee_name: input.name.trim(),
        invitee_email: email,
        invitee_phone: input.phone,
        invitee_timezone: input.timezone,
        user_id: input.userId,
        start_time: start,
        end_time: end,
        block_start: new Date(w.start).toISOString(),
        block_end: new Date(w.end).toISOString(),
        answers: JSON.stringify(input.answers),
        location: locationText(type),
        manage_token_hash,
      })
      .execute()
    if (!(await stillFree(trx, type, availability, input.start, now, id))) {
      await trx.deleteFrom("bookings").where("id", "=", id).execute()
      return { ok: false, reason: "taken" } as const
    }
    return { ok: true, id, token, start, end } as const
  })
}

/** Moves a meeting. Its manage link keeps working and the reminder is sent again for the new time. */
export const rescheduleBooking = async (
  db: Db,
  bookingId: string,
  type: EventType,
  availability: Availability,
  input: { start: number; now?: number },
): Promise<
  | { ok: true; start: string; end: string; sequence: number }
  | { ok: false; reason: "taken" | "closed" }
> => {
  const now = input.now ?? Date.now()
  const date = localDate(input.start, availability.timezone)
  const start = new Date(input.start).toISOString()
  const end = new Date(
    input.start + type.durationMinutes * 60_000,
  ).toISOString()
  const w = blockedWindow(input.start, slotRule(type))
  return db.transaction().execute(async (trx) => {
    await trx
      .updateTable("booking_lock")
      .set({ touched_at: nowIso() })
      .execute()
    const current = await trx
      .selectFrom("bookings")
      .select([
        "status",
        "start_time",
        "end_time",
        "block_start",
        "block_end",
        "reminder_sent_at",
        "sequence",
        "updated_at",
      ])
      .where("id", "=", bookingId)
      .executeTakeFirst()
    if (
      !current ||
      current.status !== "scheduled" ||
      Date.parse(current.start_time ?? "") < now
    )
      return { ok: false, reason: "closed" } as const
    const busy = await loadBusy(
      trx,
      input.start - DAY,
      input.start + DAY,
      bookingId,
    )
    const free = computeSlots(slotRule(type), availability, busy, {
      now,
      from: date,
      to: date,
    })
    if (!free.includes(input.start))
      return { ok: false, reason: "taken" } as const
    const sequence = current.sequence + 1
    await trx
      .updateTable("bookings")
      .set({
        start_time: start,
        end_time: end,
        block_start: new Date(w.start).toISOString(),
        block_end: new Date(w.end).toISOString(),
        reminder_sent_at: null,
        sequence,
        updated_at: nowIso(),
      })
      .where("id", "=", bookingId)
      .execute()
    if (
      !(await stillFree(trx, type, availability, input.start, now, bookingId))
    ) {
      const previous = {
        start_time: current.start_time,
        end_time: current.end_time,
        block_start: current.block_start,
        block_end: current.block_end,
        reminder_sent_at: current.reminder_sent_at,
        sequence: current.sequence,
        updated_at: current.updated_at,
      }
      await trx
        .updateTable("bookings")
        .set(previous)
        .where("id", "=", bookingId)
        .execute()
      return { ok: false, reason: "taken" } as const
    }
    return { ok: true, start, end, sequence } as const
  })
}

export const cancelBooking = async (
  db: Db,
  bookingId: string,
  reason: string | null,
) => {
  const row = await db
    .updateTable("bookings")
    .set((eb) => ({
      status: "canceled" as const,
      cancel_reason: reason,
      sequence: eb("sequence", "+", 1),
      updated_at: nowIso(),
    }))
    .where("id", "=", bookingId)
    .where("status", "=", "scheduled")
    .returning("id")
    .executeTakeFirst()
  return !!row
}

/** A manage URL holds either the emailed token, or the booking id for its signed-in owner or staff. */
export const findManagedBooking = async (
  db: Db,
  param: string,
  viewer: { userId?: string | null; isStaff?: boolean },
) => {
  if (!param || param.length > 100) return null
  const select = db
    .selectFrom("bookings")
    .selectAll()
    .where("provider", "=", "native")
  const byToken = await select
    .where("manage_token_hash", "=", await sha256Hex(param))
    .executeTakeFirst()
  if (byToken) return byToken
  if (!viewer.userId) return null
  const byId = await select.where("id", "=", param).executeTakeFirst()
  if (!byId) return null
  return viewer.isStaff || byId.user_id === viewer.userId ? byId : null
}

/** Host-zone dates that cover a visitor's month, padded because their days straddle the host's. */
export const paddedRange = (from: string, to: string) => ({
  from: addDays(from, -1),
  to: addDays(to, 1),
})
