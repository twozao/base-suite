// Privacy-friendly analytics helpers. We store only (day, path) and
// (day, referrer host) counters - no IPs, cookies, user ids or user agents.

const BOT_RE =
  /bot|crawl|spider|slurp|preview|headless|lighthouse|pingdom|monitor|curl|wget|python|http-client/i
const PATH_RE = /^\/[A-Za-z0-9/_\-.~%]*$/
const PRIVATE_RE =
  /^\/(admin|account|api|login|auth|newsletter\/(confirm|unsubscribe))(\/|$)/

export const isBot = (ua: string | null) => !ua || BOT_RE.test(ua)

/** Normalise a path for counting, or null if it shouldn't be counted. */
export const countablePath = (raw: unknown): string | null => {
  if (typeof raw !== "string" || raw.length > 200 || !PATH_RE.test(raw))
    return null
  if (PRIVATE_RE.test(raw)) return null
  return raw.length > 1 ? raw.replace(/\/+$/, "") : raw
}

/** External referrer host (lowercase, no www.), or null. */
export const referrerHost = (raw: unknown, ownHost: string): string | null => {
  if (typeof raw !== "string" || !raw || raw.length > 2000) return null
  try {
    const u = new URL(raw)
    if (u.protocol !== "https:" && u.protocol !== "http:") return null
    const host = u.hostname.toLowerCase().replace(/^www\./, "")
    if (
      !host ||
      host ===
        ownHost
          .toLowerCase()
          .replace(/^www\./, "")
          .split(":")[0]
    )
      return null
    return host.slice(0, 120)
  } catch {
    return null
  }
}
