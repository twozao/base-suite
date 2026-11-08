import { error, json, type RequestHandler } from "@sveltejs/kit"
import { authenticateToken } from "$lib/server/plugins/tokens"
import { contentApi } from "$lib/server/plugins/content_api"
import { clientIp } from "$lib/server/security/request"
import { rateLimit, RATE_LIMITS } from "$lib/server/security/rate_limit"
import { isModuleEnabled } from "$lib/modules"

// Content API, version 1. Tokens are made in Admin -> API & webhooks. Browsers on other sites may read
// published content; writes come from servers with a token, never with cookies.
const handle: RequestHandler = async (event) => {
  if (!isModuleEnabled("cms")) error(404, "Not found")
  const header = event.request.headers.get("authorization")
  const auth = header ? await authenticateToken(event.locals.db, header) : null
  if (header && !auth) error(401, "Invalid or revoked token")
  const key = auth ? `api:${auth.id}` : `api-ip:${clientIp(event)}`
  if (!(await rateLimit(event.locals.db, key, RATE_LIMITS.api)))
    error(429, "Too many requests")
  if (event.request.method !== "GET" && !auth)
    error(401, "This needs an API token")
  const parts = (event.params.path ?? "").split("/").filter(Boolean)
  const res = await contentApi(event, auth, parts)
  res.headers.set("cache-control", "private, no-store")
  if (event.request.method === "GET" && !auth)
    res.headers.set("access-control-allow-origin", "*")
  return res
}

export const GET = handle
export const POST = handle
export const PATCH = handle
export const PUT = handle
export const DELETE = handle
export const OPTIONS: RequestHandler = () =>
  new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET",
      "access-control-max-age": "86400",
    },
  })
// Errors as JSON for API clients.
export const fallback: RequestHandler = () =>
  json({ error: "Method not allowed" }, { status: 405 })
