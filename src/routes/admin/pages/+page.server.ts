import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { isCmsStatus } from "$lib/server/cms/pages"
import { containsText } from "$lib/server/db/query"
import { pageParams, searchParam } from "$lib/server/pagination"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  requireModule("cms")
  await requirePermission(event, "cms.edit")
  const q = searchParam(event.url)
  const status = event.url.searchParams.get("status") ?? ""
  const { page, size, from } = pageParams(event.url)
  const db = event.locals.db
  let base = db.selectFrom("cms_pages")
  if (isCmsStatus(status)) base = base.where("status", "=", status)
  if (q) {
    base = base.where((eb) =>
      eb.or([
        containsText("cms_pages.title", q),
        containsText("cms_pages.slug", q),
      ]),
    )
  }
  const [{ n }, rows] = await Promise.all([
    base.select(db.fn.countAll<number>().as("n")).executeTakeFirstOrThrow(),
    base
      .select(["id", "slug", "title", "status", "updated_at", "published_at"])
      .orderBy("updated_at", "desc")
      .limit(size)
      .offset(from)
      .execute(),
  ])
  return { rows, total: Number(n), page, size, q, status }
}
