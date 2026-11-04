import { requirePermission } from "$lib/server/auth/staff"
import { listUsers } from "$lib/server/auth/directory"
import { pageParams, searchParam } from "$lib/server/pagination"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  await requirePermission(event, "users.view")
  const q = searchParam(event.url)
  const { page, size, from } = pageParams(event.url)
  const { users, total } = await listUsers(event.locals.db, {
    search: q,
    limit: size,
    offset: from,
  })
  return { users, total, page, size, q }
}
