import { fail } from "@sveltejs/kit"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { pageParams, searchParam } from "$lib/server/pagination"
import { containsText } from "$lib/server/db/query"
import { isUuid } from "$lib/server/ids"
import { audit } from "$lib/server/audit"
import type { NewsletterStatus } from "$lib/server/db/schema"
import type { Actions, PageServerLoad } from "./$types"

const STATUSES: readonly NewsletterStatus[] = [
  "confirmed",
  "pending",
  "unsubscribed",
]
const isStatus = (v: string): v is NewsletterStatus =>
  (STATUSES as readonly string[]).includes(v)

export const load: PageServerLoad = async (event) => {
  requireModule("newsletter")
  await requirePermission(event, "newsletter.manage")
  const db = event.locals.db
  const status = event.url.searchParams.get("status") ?? "confirmed"
  const q = searchParam(event.url)
  const { page, size, from } = pageParams(event.url)

  let base = db.selectFrom("newsletter_subscribers")
  if (isStatus(status)) base = base.where("status", "=", status)
  if (q) {
    base = base.where((eb) =>
      eb.or([containsText("email", q), containsText("name", q)]),
    )
  }
  const monthAgo = new Date(Date.now() - 30 * 86400e3).toISOString()
  const [rows, { n: total }, byStatus, { n: last30 }] = await Promise.all([
    base
      .select([
        "id",
        "email",
        "name",
        "status",
        "source",
        "created_at",
        "confirmed_at",
      ])
      .orderBy("created_at", "desc")
      .limit(size)
      .offset(from)
      .execute(),
    base.select(db.fn.countAll<number>().as("n")).executeTakeFirstOrThrow(),
    db
      .selectFrom("newsletter_subscribers")
      .select(["status", db.fn.countAll<number>().as("n")])
      .groupBy("status")
      .execute(),
    db
      .selectFrom("newsletter_subscribers")
      .select(db.fn.countAll<number>().as("n"))
      .where("status", "=", "confirmed")
      .where("confirmed_at", ">=", monthAgo)
      .executeTakeFirstOrThrow(),
  ])
  const count = (s: NewsletterStatus) =>
    Number(byStatus.find((r) => r.status === s)?.n ?? 0)
  return {
    rows,
    total: Number(total),
    page,
    size,
    status,
    q,
    stats: {
      confirmed: count("confirmed"),
      pending: count("pending"),
      unsubscribed: count("unsubscribed"),
      last30: Number(last30),
    },
  }
}

export const actions: Actions = {
  delete: async (event) => {
    requireModule("newsletter")
    await requirePermission(event, "newsletter.manage")
    const id = String((await event.request.formData()).get("id") ?? "")
    if (!isUuid(id)) return fail(400, { error: "Invalid subscriber" })
    await event.locals.db
      .deleteFrom("newsletter_subscribers")
      .where("id", "=", id)
      .execute()
    await audit(event, "newsletter.subscriber_deleted", {
      type: "subscriber",
      id,
    })
    return { message: "Subscriber deleted" }
  },
}
