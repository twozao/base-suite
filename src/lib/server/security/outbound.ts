// Checks for addresses the server fetches on someone's behalf (image import, webhooks, apps), so an
// admin form cannot be used to reach the machine's own network. Workers cannot reach private networks.

const PRIVATE_V4 = [
  /^0\./,
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  /^198\.1[89]\./,
  /^2(2[4-9]|[3-5]\d)\./,
]

export const isPrivateAddress = (ip: string): boolean => {
  const v = ip.replace(/^\[|\]$/g, "").toLowerCase()
  if (/^\d+\.\d+\.\d+\.\d+$/.test(v)) return PRIVATE_V4.some((r) => r.test(v))
  if (v.includes(":")) {
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v)
    if (mapped) return isPrivateAddress(mapped[1])
    // Only global unicast (2000::/3) is public.
    return !/^[23][0-9a-f]{0,3}:/.test(v)
  }
  return false
}

/** The URL if it is https on a public host name or address, otherwise an error message. */
export const publicHttpsUrl = (raw: string): URL | string => {
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return "Not a valid address"
  }
  if (u.protocol !== "https:") return "Only https:// addresses are allowed"
  if (u.username || u.password)
    return "Addresses with a user name are not allowed"
  const host = u.hostname.toLowerCase()
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    (!host.includes(".") && !host.includes(":"))
  )
    return "That address is not public"
  if (isPrivateAddress(host)) return "That address is not public"
  if (u.port && u.port !== "443")
    return "Only the standard https port is allowed"
  return u
}

/** On Node, also refuses names that resolve to a private address. Workers skip this; they cannot reach one. */
const resolvesPrivate = async (host: string): Promise<boolean> => {
  if (__CLOUDFLARE__) return false
  try {
    const dns = await import("node:dns/promises")
    const found = await dns.lookup(host, { all: true })
    return found.some((a) => isPrivateAddress(a.address))
  } catch {
    return true
  }
}

/** fetch() for an outside address: public https only, no redirects followed, a time limit and a size cap. */
export const fetchPublic = async (
  raw: string,
  init: RequestInit & { timeoutMs?: number; maxBytes?: number } = {},
): Promise<
  { ok: true; res: Response; bytes: Uint8Array } | { ok: false; error: string }
> => {
  const u = publicHttpsUrl(raw)
  if (typeof u === "string") return { ok: false, error: u }
  if (await resolvesPrivate(u.hostname))
    return { ok: false, error: "That address is not public" }
  const { timeoutMs = 10_000, maxBytes = 5 * 1024 * 1024, ...rest } = init
  try {
    const res = await fetch(u, {
      ...rest,
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    })
    const reader = res.body?.getReader()
    const chunks: Uint8Array[] = []
    let total = 0
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        total += value.byteLength
        if (total > maxBytes) {
          await reader.cancel()
          return { ok: false, error: "The response is too large" }
        }
        chunks.push(value)
      }
    }
    const bytes = new Uint8Array(total)
    let at = 0
    for (const c of chunks) {
      bytes.set(c, at)
      at += c.byteLength
    }
    return { ok: true, res, bytes }
  } catch (e) {
    const timeout = e instanceof Error && e.name === "TimeoutError"
    return {
      ok: false,
      error: timeout
        ? "The address took too long to answer"
        : "Could not reach the address",
    }
  }
}
