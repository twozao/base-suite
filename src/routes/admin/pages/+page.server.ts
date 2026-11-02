import { error } from "@sveltejs/kit"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { ilikeTerm, pageParams, searchParam } from "$lib/server/pagination"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  requireModule("cms")
  await requirePermission(event, "cms.edit")
  const q = searchParam(event.url)
  const status = event.url.searchParams.get("status") ?? ""
  const { page, size, from, to } = pageParams(event.url)
  let query = event.locals.supabaseServiceRole
    .from("cms_pages")
    .select("id, slug, title, status, updated_at, published_at", {
      count: "exact",
    })
    .order("updated_at", { ascending: false })
    .range(from, to)
  if (status === "draft" || status === "published" || status === "archived")
    query = query.eq("status", status)
  if (q) {
    const t = ilikeTerm(q)
    query = query.or(`title.ilike.${t},slug.ilike.${t}`)
  }
  const { data, count, error: e } = await query
  if (e) error(500, "Could not load pages")
  return { rows: data ?? [], total: count ?? 0, page, size, q, status }
}
