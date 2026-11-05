import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { containsText } from "$lib/server/db/query"
import { pageParams, searchParam } from "$lib/server/pagination"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  requireModule("chat")
  const staff = await requirePermission(event, "chat.respond")
  event.depends("admin:support")
  const filter = event.url.searchParams.get("filter") ?? "open"
  const q = searchParam(event.url)
  const { page, size, from } = pageParams(event.url)
  const db = event.locals.db

  let base = db.selectFrom("chat_conversations")
  if (filter === "open") base = base.where("status", "!=", "closed")
  else if (filter === "mine")
    base = base
      .where("assigned_to", "=", staff.userId)
      .where("status", "!=", "closed")
  else if (filter === "unassigned")
    base = base.where("assigned_to", "is", null).where("status", "!=", "closed")
  else if (filter === "closed") base = base.where("status", "=", "closed")
  if (q) {
    base = base.where((eb) =>
      eb.or([
        containsText("visitor_email", q),
        containsText("visitor_name", q),
      ]),
    )
  }
  const [{ n }, rows] = await Promise.all([
    base.select(db.fn.countAll<number>().as("n")).executeTakeFirstOrThrow(),
    base
      .select([
        "id",
        "user_id",
        "visitor_name",
        "visitor_email",
        "page_url",
        "status",
        "assigned_to",
        "unread_by_staff",
        "last_message_at",
      ])
      .orderBy("last_message_at", "desc")
      .limit(size)
      .offset(from)
      .execute(),
  ])
  return {
    rows,
    total: Number(n),
    page,
    size,
    filter,
    q,
    me: staff.userId,
  }
}
