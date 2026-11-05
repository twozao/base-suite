import type { RequestEvent } from "@sveltejs/kit"

/**
 * Client IP as resolved by the platform adapter (adapter-node reads ADDRESS_HEADER, adapter-cloudflare
 * cf-connecting-ip, adapter-vercel x-forwarded-for). Raw headers are never trusted: a client can set them.
 */
export const clientIp = (event: RequestEvent): string => {
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
