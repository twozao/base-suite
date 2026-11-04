import { error } from "@sveltejs/kit"
import { readMedia } from "$lib/server/media"
import type { RequestHandler } from "./$types"

// Serves uploaded images from local disk. Names are unique per upload, so they can be cached forever.
export const GET: RequestHandler = async ({ params, setHeaders }) => {
  const file = await readMedia(params.name)
  if (!file) error(404, "Not found")
  setHeaders({
    "content-type": file.type,
    "content-length": String(file.bytes.byteLength),
    "cache-control": "public, max-age=31536000, immutable",
  })
  return new Response(new Uint8Array(file.bytes))
}
