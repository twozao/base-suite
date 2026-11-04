import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { containsText } from "$lib/server/db/query"
import { pageParams, searchParam } from "$lib/server/pagination"
import type { PageServerLoad } from "./$types"

const STATUSES = ["new", "open", "closed", "spam"] as const

export const load: PageServerLoad = async (event) => {
  requireModule("contact")
  await requirePermission(event, "contact.manage")
  const q = searchParam(event.url)
  const status = event.url.searchParams.get("status") ?? "new"
  const { page, size, from } = pageParams(event.url)
  const db = event.locals.db

  let base = db.selectFrom("contact_requests")
  if ((STATUSES as readonly string[]).includes(status))
    base = base.where("status", "=", status as (typeof STATUSES)[number])
  if (q) {
    base = base.where((eb) =>
      eb.or([
        containsText("email", q),
        containsText("first_name", q),
        containsText("last_name", q),
        containsText("company_name", q),
      ]),
    )
  }
  const [{ n }, rows] = await Promise.all([
    base.select(db.fn.countAll<number>().as("n")).executeTakeFirstOrThrow(),
    base
      .select([
        "id",
        "first_name",
        "last_name",
        "email",
        "company_name",
        "message_body",
        "status",
        "created_at",
      ])
      .orderBy("created_at", "desc")
      .limit(size)
      .offset(from)
      .execute(),
  ])
  return {
    rows,
    total: Number(n),
    page,
    size,
    q,
    status,
    statuses: STATUSES,
  }
}
