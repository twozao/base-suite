import type { RequestEvent } from "@sveltejs/kit"

/** Best-effort client IP, preferring headers set by the edge (not the user). */
export const clientIp = (event: RequestEvent): string => {
  const h = event.request.headers
  const fromEdge =
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim()
  if (fromEdge) return fromEdge.slice(0, 64)
  try {
    return event.getClientAddress().slice(0, 64)
  } catch {
    return "unknown"
  }
}

/**
 * SvelteKit's built-in CSRF check only covers form content types. JSON
 * endpoints call this to require a same-origin request.
 */
export const isSameOrigin = (event: RequestEvent): boolean => {
  const origin = event.request.headers.get("origin")
  if (origin) return origin === event.url.origin
  // No Origin header: fall back to Sec-Fetch-Site (sent by all modern browsers)
  const site = event.request.headers.get("sec-fetch-site")
  return site === "same-origin"
}
