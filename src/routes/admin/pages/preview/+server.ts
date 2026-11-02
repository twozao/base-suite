import { error, json } from "@sveltejs/kit"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { isSameOrigin } from "$lib/server/security/request"
import { renderMarkdown } from "$lib/server/cms/markdown"
import type { RequestHandler } from "./$types"

export const POST: RequestHandler = async (event) => {
  requireModule("cms")
  await requirePermission(event, "cms.edit")
  if (!isSameOrigin(event)) error(403, "Cross-origin request blocked")
  const form = await event.request.formData()
  const md = String(form.get("body_md") ?? "")
  if (md.length > 200_000) error(413, "Too long")
  return json({ html: renderMarkdown(md) })
}
