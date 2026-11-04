import { requirePermission } from "$lib/server/auth/staff"
import { isAuditAction } from "$lib/server/audit"
import { parseJson } from "$lib/server/db/json"
import type { Json } from "$lib/server/db/schema"
import { pageParams } from "$lib/server/pagination"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  await requirePermission(event, "audit.view")
  const { page, size, from } = pageParams(event.url, 50)
  const requested = event.url.searchParams.get("action")
  const action = isAuditAction(requested) ? requested : ""
  const db = event.locals.db

  let base = db.selectFrom("audit_log")
  if (action) base = base.where("action", "=", action)
  const [{ n }, data] = await Promise.all([
    base.select(db.fn.countAll<number>().as("n")).executeTakeFirstOrThrow(),
    base
      .select([
        "id",
        "actor_id",
        "action",
        "target_type",
        "target_id",
        "meta",
        "ip",
        "created_at",
      ])
      .orderBy("id", "desc")
      .limit(size)
      .offset(from)
      .execute(),
  ])
  const rows = data.map((r) => ({ ...r, meta: parseJson<Json>(r.meta, {}) }))

  // Resolve actor emails for the rows on this page only
  const actorIds = [
    ...new Set(rows.map((r) => r.actor_id).filter((id) => id !== null)),
  ]
  const emails: Record<string, string> = {}
  if (actorIds.length) {
    const users = await db
      .selectFrom("users")
      .select(["id", "email"])
      .where("id", "in", actorIds)
      .execute()
    for (const u of users) emails[u.id] = u.email
  }
  return { rows, total: Number(n), page, size, action, emails }
}
