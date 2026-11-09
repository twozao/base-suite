import { env } from "$env/dynamic/private"
import { requirePermission } from "$lib/server/auth/staff"
import { fromEmail } from "$lib/server/auth/flows"
import type { PageServerLoad } from "./$types"

const STATUSES = ["sent", "failed", "skipped"] as const

export const load: PageServerLoad = async (event) => {
  await requirePermission(event, "email.manage")
  const db = event.locals.db
  const status = event.url.searchParams.get("status") ?? ""
  const q = (event.url.searchParams.get("q") ?? "").trim().slice(0, 100)
  const rows = await db
    .selectFrom("email_log as l")
    .leftJoin("users as u", "u.id", "l.sent_by")
    .select([
      "l.id",
      "l.template",
      "l.to_email",
      "l.subject",
      "l.status",
      "l.source",
      "l.error",
      "l.body_text",
      "l.provider_id",
      "l.created_at",
      "u.email as sent_by_email",
    ])
    .$if((STATUSES as readonly string[]).includes(status), (qb) =>
      qb.where("l.status", "=", status as (typeof STATUSES)[number]),
    )
    .$if(!!q, (qb) =>
      qb.where((eb) =>
        eb.or([
          eb("l.to_email", "like", `%${q}%`),
          eb("l.subject", "like", `%${q}%`),
        ]),
      ),
    )
    .orderBy("l.id", "desc")
    .limit(200)
    .execute()
  const counts = await db
    .selectFrom("email_log")
    .select(["status", db.fn.countAll<number>().as("n")])
    .groupBy("status")
    .execute()
  return {
    rows: rows.map((r) => ({ ...r, id: Number(r.id) })),
    counts: Object.fromEntries(counts.map((c) => [c.status, Number(c.n)])),
    status,
    q,
    provider: {
      configured: !!env.PRIVATE_RESEND_API_KEY,
      from: fromEmail(),
    },
  }
}
