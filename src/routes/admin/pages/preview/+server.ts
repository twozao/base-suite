import { error, json } from "@sveltejs/kit"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { isSameOrigin } from "$lib/server/security/request"
import { bodyFrom, readBlocksField } from "$lib/server/cms/content"
import type { RequestHandler } from "./$types"

// Renders the editor's blocks with the same code used on save.
export const POST: RequestHandler = async (event) => {
  requireModule("cms")
  await requirePermission(event, "cms.write")
  if (!isSameOrigin(event)) error(403, "Cross-origin request blocked")
  const form = await event.request.formData()
  const read = readBlocksField(form.get("blocks"))
  if ("error" in read) error(400, read.error)
  return json({
    html: (await bodyFrom(event.locals.db, read.blocks)).body_html,
  })
}
