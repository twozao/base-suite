import { z } from "zod"
import type { Db } from "../db"
import { parseJson } from "../db/json"
import type { Json } from "../db/schema"
import type { SlotRule } from "$lib/booking/slots"

const QUESTION_KINDS = ["text", "textarea", "select"] as const
export const LOCATION_KINDS = ["video", "phone", "in_person", "custom"] as const
export const LOCATION_LABELS: Record<(typeof LOCATION_KINDS)[number], string> =
  {
    video: "Video call",
    phone: "Phone call",
    in_person: "In person",
    custom: "See details",
  }

const questionSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9_-]{1,40}$/),
    label: z.string().trim().min(1, "Each question needs a label").max(200),
    kind: z.enum(QUESTION_KINDS),
    required: z.boolean(),
    options: z.array(z.string().trim().min(1).max(100)).max(20),
  })
  .refine((q) => q.kind !== "select" || q.options.length > 0, {
    message: "A choice question needs at least one option",
  })
export type BookingQuestion = z.output<typeof questionSchema>

export const eventTypeSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers and dashes",
    )
    .max(80)
    .refine((s) => s !== "manage", "That URL is reserved"),
  description: z.string().trim().max(1000),
  durationMinutes: z.number().int().min(5, "At least 5 minutes").max(480),
  locationKind: z.enum(LOCATION_KINDS),
  locationDetail: z.string().trim().max(500),
  bufferBefore: z.number().int().min(0).max(240),
  bufferAfter: z.number().int().min(0).max(240),
  minNoticeMinutes: z.number().int().min(0).max(86_400),
  maxDaysAhead: z.number().int().min(1).max(365),
  slotInterval: z
    .number()
    .int()
    .min(5, "Start times need at least 5 minutes")
    .max(240),
  dailyLimit: z.number().int().min(1).max(100).nullable(),
  active: z.boolean(),
  questions: z.array(questionSchema).max(10),
})
export type EventTypeInput = z.output<typeof eventTypeSchema>
export type EventType = EventTypeInput & { id: string; sortOrder: number }

type Row = {
  id: string
  slug: string
  name: string
  description: string
  duration_minutes: number
  location_kind: string
  location_detail: string
  buffer_before: number
  buffer_after: number
  min_notice_minutes: number
  max_days_ahead: number
  slot_interval: number
  daily_limit: number | null
  questions: string
  active: number
  sort_order: number
}

export const toEventType = (r: Row): EventType => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  description: r.description,
  durationMinutes: r.duration_minutes,
  locationKind: r.location_kind as EventType["locationKind"],
  locationDetail: r.location_detail,
  bufferBefore: r.buffer_before,
  bufferAfter: r.buffer_after,
  minNoticeMinutes: r.min_notice_minutes,
  maxDaysAhead: r.max_days_ahead,
  slotInterval: r.slot_interval,
  dailyLimit: r.daily_limit,
  active: r.active === 1,
  sortOrder: r.sort_order,
  questions: z
    .array(questionSchema)
    .catch([])
    .parse(parseJson<Json>(r.questions, [])),
})

export const toRow = (t: EventTypeInput) => ({
  slug: t.slug,
  name: t.name,
  description: t.description,
  duration_minutes: t.durationMinutes,
  location_kind: t.locationKind,
  location_detail: t.locationDetail,
  buffer_before: t.bufferBefore,
  buffer_after: t.bufferAfter,
  min_notice_minutes: t.minNoticeMinutes,
  max_days_ahead: t.maxDaysAhead,
  slot_interval: t.slotInterval,
  daily_limit: t.dailyLimit,
  questions: JSON.stringify(t.questions),
  active: t.active ? 1 : 0,
})

export const slotRule = (t: EventType): SlotRule => ({
  id: t.id,
  durationMinutes: t.durationMinutes,
  bufferBefore: t.bufferBefore,
  bufferAfter: t.bufferAfter,
  minNoticeMinutes: t.minNoticeMinutes,
  maxDaysAhead: t.maxDaysAhead,
  slotInterval: t.slotInterval,
  dailyLimit: t.dailyLimit,
})

/** What a visitor may see before booking. The meeting link or address stays private until then. */
export const publicEventType = (t: EventType) => ({
  id: t.id,
  slug: t.slug,
  name: t.name,
  description: t.description,
  durationMinutes: t.durationMinutes,
  locationKind: t.locationKind,
  locationLabel: LOCATION_LABELS[t.locationKind],
  questions: t.questions,
})
export type PublicEventType = ReturnType<typeof publicEventType>

export const listEventTypes = async (
  db: Db,
  opts: { activeOnly?: boolean } = {},
) => {
  let q = db.selectFrom("booking_event_types").selectAll()
  if (opts.activeOnly) q = q.where("active", "=", 1)
  const rows = await q.orderBy("sort_order").orderBy("name").execute()
  return rows.map(toEventType)
}

export const eventTypeBySlug = async (db: Db, slug: string) => {
  const row = await db
    .selectFrom("booking_event_types")
    .selectAll()
    .where("slug", "=", slug)
    .executeTakeFirst()
  return row ? toEventType(row) : null
}

export const eventTypeById = async (db: Db, id: string) => {
  const row = await db
    .selectFrom("booking_event_types")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst()
  return row ? toEventType(row) : null
}

/** Validates answers against the event type's questions; keeps each question's label with its answer. */
export const parseAnswers = (
  questions: BookingQuestion[],
  read: (id: string) => string,
):
  | { ok: true; answers: { label: string; value: string }[] }
  | { ok: false; field: string; error: string } => {
  const answers: { label: string; value: string }[] = []
  for (const q of questions) {
    const value = read(q.id).trim().slice(0, 2000)
    if (q.required && !value)
      return { ok: false, field: `q_${q.id}`, error: `${q.label} is required` }
    if (q.kind === "select" && value && !q.options.includes(value))
      return {
        ok: false,
        field: `q_${q.id}`,
        error: "Choose one of the options",
      }
    if (value) answers.push({ label: q.label, value })
  }
  return { ok: true, answers }
}
