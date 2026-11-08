import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { typeFromParams } from "$lib/server/cms/editor"
import { containsText } from "$lib/server/db/query"
import { isCmsStatus } from "$lib/server/cms/pages"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  requireModule("cms")
  await requirePermission(event, "cms.write")
  const db = event.locals.db
  const type = await typeFromParams(db, event.params.type)
  const q = (event.url.searchParams.get("q") ?? "").trim().slice(0, 100)
  const status = event.url.searchParams.get("status") ?? ""
  const entries = await db
    .selectFrom("content_entries")
    .select([
      "id",
      "slug",
      "title",
      "status",
      "review_requested_at",
      "updated_at",
      "sort_order",
    ])
    .where("type_id", "=", type.id)
    .$if(!!q, (qb) => qb.where(containsText("title", q)))
    .$if(isCmsStatus(status), (qb) =>
      qb.where("status", "=", status as "draft"),
    )
    .orderBy("sort_order")
    .orderBy("updated_at", "desc")
    .limit(200)
    .execute()
  return { type, entries, q, status }
}
