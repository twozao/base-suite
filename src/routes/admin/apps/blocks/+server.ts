import { json } from "@sveltejs/kit"
import { requirePermission } from "$lib/server/auth/staff"
import type { RequestHandler } from "./$types"

// Apps and their blocks, for the block editor's App block.
export const GET: RequestHandler = async (event) => {
  await requirePermission(event, "cms.write")
  const apps = await event.locals.db
    .selectFrom("apps")
    .select(["id", "name", "blocks"])
    .where("enabled", "=", 1)
    .orderBy("name")
    .execute()
  return json(
    {
      apps: apps
        .map((a) => ({ id: a.id, name: a.name, blocks: JSON.parse(a.blocks) }))
        .filter((a) => a.blocks.length),
    },
    { headers: { "cache-control": "private, no-store" } },
  )
}
