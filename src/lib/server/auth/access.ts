import { env } from "$env/dynamic/private"

// Optional Cloudflare Access in front of /admin. With CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUD set, every
// admin request must carry a valid Access token for this application, on top of the normal sign-in.

type Jwk = JsonWebKey & { kid?: string }
let keys: { at: number; list: Jwk[] } | null = null

export const accessConfigured = () =>
  !!(env.CF_ACCESS_TEAM_DOMAIN && env.CF_ACCESS_AUD)

const team = () =>
  `https://${(env.CF_ACCESS_TEAM_DOMAIN ?? "").replace(/^https?:\/\//, "").replace(/\/+$/, "")}`

const b64urlBytes = (s: string) =>
  Uint8Array.from(
    atob(
      s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4),
    ),
    (c) => c.charCodeAt(0),
  )

const certs = async () => {
  if (keys && Date.now() - keys.at < 60 * 60 * 1000) return keys.list
  const res = await fetch(`${team()}/cdn-cgi/access/certs`, {
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`Access certs answered ${res.status}`)
  const body = (await res.json()) as { keys?: Jwk[] }
  keys = { at: Date.now(), list: body.keys ?? [] }
  return keys.list
}

/** True when the request carries a valid Access token for this application. */
export const verifyAccess = async (request: Request): Promise<boolean> => {
  const token = request.headers.get("cf-access-jwt-assertion")
  if (!token) return false
  const [h, p, sig] = token.split(".")
  if (!h || !p || !sig) return false
  try {
    const header = JSON.parse(new TextDecoder().decode(b64urlBytes(h))) as {
      alg?: string
      kid?: string
    }
    const claims = JSON.parse(new TextDecoder().decode(b64urlBytes(p))) as {
      aud?: string | string[]
      iss?: string
      exp?: number
      nbf?: number
    }
    if (header.alg !== "RS256") return false
    const jwk = (await certs()).find((k) => k.kid === header.kid)
    if (!jwk) return false
    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    )
    const ok = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      b64urlBytes(sig),
      new TextEncoder().encode(`${h}.${p}`),
    )
    if (!ok) return false
    const now = Date.now() / 1000
    const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
    return (
      aud.includes(env.CF_ACCESS_AUD) &&
      claims.iss === team() &&
      typeof claims.exp === "number" &&
      claims.exp > now &&
      (claims.nbf === undefined || claims.nbf <= now + 60)
    )
  } catch {
    return false
  }
}
