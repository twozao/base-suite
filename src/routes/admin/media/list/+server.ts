import { json } from "@sveltejs/kit"
import { requirePermission } from "$lib/server/auth/staff"
import { listMedia } from "$lib/server/media"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async (event) => {
  await requirePermission(event, "cms.edit")
  const { files } = await listMedia()
  return json(
    { files: files.map((f) => ({ name: f.name, url: f.url })) },
    { headers: { "cache-control": "private, no-store" } },
  )
}
