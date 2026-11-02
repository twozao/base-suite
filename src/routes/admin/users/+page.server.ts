import { error } from "@sveltejs/kit"
import { requirePermission } from "$lib/server/auth/staff"
import { pageParams, searchParam } from "$lib/server/pagination"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  await requirePermission(event, "users.view")
  const q = searchParam(event.url)
  const { page, size, from } = pageParams(event.url)
  const { data, error: dbError } = await event.locals.supabaseServiceRole.rpc(
    "admin_list_users",
    { p_search: q || null, p_limit: size, p_offset: from },
  )
  if (dbError) error(500, "Could not load users")
  return {
    users: data ?? [],
    total: Number(data?.[0]?.total_count ?? 0),
    page,
    size,
    q,
  }
}
