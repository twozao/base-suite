import { json } from "@sveltejs/kit"
import { requirePermission } from "$lib/server/auth/staff"
import { mediaLibrary } from "$lib/server/media_library"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async (event) => {
  await requirePermission(event, "cms.write")
  const { files } = await mediaLibrary(event.locals.db)
  return json(
    { files: files.map((f) => ({ name: f.name, url: f.url, alt: f.alt })) },
    { headers: { "cache-control": "private, no-store" } },
  )
}
