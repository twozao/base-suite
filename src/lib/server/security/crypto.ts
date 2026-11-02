// Small WebCrypto helpers. Works on Node 18+, Cloudflare Workers, Vercel Edge.

const encoder = new TextEncoder()

export const toHex = (buf: ArrayBuffer | Uint8Array): string =>
  Array.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")

/** Cryptographically random URL-safe token (default 32 bytes = 256 bits). */
export const randomToken = (bytes = 32): string => {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

export const sha256Hex = async (input: string): Promise<string> =>
  toHex(await crypto.subtle.digest("SHA-256", encoder.encode(input)))

export const hmacSha256Hex = async (
  secret: string,
  message: string,
): Promise<string> => {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(message)))
}

/** Constant-time string comparison (for signatures / hashes). */
export const timingSafeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
