import { isModuleEnabled } from "$lib/modules"
import { isSameOrigin } from "$lib/server/security/request"
import { countablePath, isBot, referrerHost } from "$lib/server/analytics"
import { recordPageView } from "./record.server"
import type { RequestHandler } from "./$types"

const NO_CONTENT = () => new Response(null, { status: 204 })

// Page view beacon. Always answers 204 so it never shows errors to visitors.
export const POST: RequestHandler = async (event) => {
  const h = event.request.headers
  if (!isModuleEnabled("analytics") || !isSameOrigin(event)) return NO_CONTENT()
  if (
    h.get("dnt") === "1" ||
    h.get("sec-gpc") === "1" ||
    isBot(h.get("user-agent"))
  )
    return NO_CONTENT()
  const text = await event.request.text()
  if (text.length > 3000) return NO_CONTENT()
  let body: { p?: unknown; r?: unknown }
  try {
    body = JSON.parse(text)
  } catch {
    return NO_CONTENT()
  }
  const path = countablePath(body.p)
  if (!path) return NO_CONTENT()
  try {
    await recordPageView(
      event.locals.db,
      path,
      referrerHost(body.r, event.url.host),
    )
  } catch (e) {
    console.error("page view count failed", e instanceof Error ? e.message : e)
  }
  return NO_CONTENT()
}
