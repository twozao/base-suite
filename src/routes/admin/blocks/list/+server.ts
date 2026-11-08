import { json } from "@sveltejs/kit"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async (event) => {
  requireModule("cms")
  await requirePermission(event, "cms.write")
  const blocks = await event.locals.db
    .selectFrom("cms_blocks")
    .select(["id", "name"])
    .orderBy("name")
    .execute()
  return json({ blocks }, { headers: { "cache-control": "private, no-store" } })
}
