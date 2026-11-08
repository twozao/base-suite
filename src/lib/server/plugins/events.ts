import type { Db } from "../db"
import { nowIso, parseStringList } from "../db/json"
import { background } from "../platform"
import { fetchPublic } from "../security/outbound"
import { openValue } from "../security/vault"
import { signBody } from "./apps"

// Things that happen on the site, sent as signed webhooks to the addresses an admin or app registered.
// Each delivery is a row, so a failed one is retried by the cron and shows in the delivery log.

export const EVENTS = [
  "content.published",
  "content.updated",
  "content.deleted",
  "form.submitted",
  "contact.created",
  "comment.created",
  "booking.created",
  "newsletter.subscribed",
  "user.created",
] as const
export type EventName = (typeof EVENTS)[number]

export const WEBHOOK_SECRET_CONTEXT = (id: string) => `webhook:${id}`

const BACKOFF_MIN = [1, 5, 30, 120, 720]
const MAX_ATTEMPTS = BACKOFF_MIN.length + 1

/** Queues the event for every active webhook that wants it, then tries to send right away. */
export const emit = async (
  db: Db,
  event: EventName,
  data: Record<string, unknown>,
) => {
  const hooks = await db
    .selectFrom("webhooks")
    .select(["id", "events"])
    .where("active", "=", 1)
    .execute()
  const wanted = hooks.filter((h) => {
    const list = parseStringList(h.events)
    return list.includes(event) || list.includes("*")
  })
  if (!wanted.length) return 0
  const payload = JSON.stringify({ event, at: nowIso(), data })
  const ids: number[] = []
  for (const h of wanted) {
    const row = await db
      .insertInto("webhook_deliveries")
      .values({ webhook_id: h.id, event, payload })
      .returning("id")
      .executeTakeFirst()
    if (row) ids.push(Number(row.id))
  }
  background(deliverDue(db, ids))
  return ids.length
}

const attempt = async (
  db: Db,
  d: {
    id: number
    webhook_id: string
    payload: string
    attempts: number
    url: string
    secret: string
  },
) => {
  const secret = openValue(d.secret, WEBHOOK_SECRET_CONTEXT(d.webhook_id))
  let code: number | null = null
  let error: string | null = null
  if (!secret) error = "The signing secret could not be opened"
  else {
    const r = await fetchPublic(d.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-base-suite-signature": await signBody(secret, d.payload),
        "x-base-suite-delivery": String(d.id),
      },
      body: d.payload,
      timeoutMs: 8000,
      maxBytes: 64 * 1024,
    })
    if (!r.ok) error = r.error
    else {
      code = r.res.status
      if (!r.res.ok) error = `The address answered ${code}`
    }
  }
  const attempts = d.attempts + 1
  const done = !error
  const failed = !done && attempts >= MAX_ATTEMPTS
  await db
    .updateTable("webhook_deliveries")
    .set({
      status: done ? "delivered" : failed ? "failed" : "pending",
      attempts,
      response_code: code,
      error: error?.slice(0, 500) ?? null,
      next_attempt_at: new Date(
        Date.now() + (BACKOFF_MIN[attempts - 1] ?? 0) * 60_000,
      ).toISOString(),
    })
    .where("id", "=", d.id)
    .execute()
  return done
}

/** Sends deliveries that are due (or the given ones). Called after an event and by the cron. */
export const deliverDue = async (db: Db, only?: number[], limit = 25) => {
  if (only && !only.length) return 0
  const rows = await db
    .selectFrom("webhook_deliveries as d")
    .innerJoin("webhooks as w", "w.id", "d.webhook_id")
    .select([
      "d.id",
      "d.webhook_id",
      "d.payload",
      "d.attempts",
      "w.url",
      "w.secret",
    ])
    .where("d.status", "=", "pending")
    .where("w.active", "=", 1)
    .$if(!!only, (q) => q.where("d.id", "in", only!))
    .$if(!only, (q) => q.where("d.next_attempt_at", "<=", nowIso()))
    .orderBy("d.id")
    .limit(limit)
    .execute()
  let sent = 0
  for (const r of rows) {
    if (await attempt(db, { ...r, id: Number(r.id) })) sent++
  }
  return sent
}

/** Sends the one delivery again now, whatever its state. */
export const redeliver = async (db: Db, id: number) => {
  await db
    .updateTable("webhook_deliveries")
    .set({ status: "pending", attempts: 0, next_attempt_at: nowIso() })
    .where("id", "=", id)
    .execute()
  return deliverDue(db, [id])
}
