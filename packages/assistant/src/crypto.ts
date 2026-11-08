// AES-GCM over WebCrypto, so secrets work the same on Workers and Node. The context is authenticated:
// a sealed value cannot be moved to another name and still open.
const enc = new TextEncoder()
const dec = new TextDecoder()

const b64 = (b: Uint8Array) => btoa(String.fromCharCode(...b))
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

const importKey = async (material: string) =>
  crypto.subtle.importKey(
    "raw",
    await crypto.subtle.digest("SHA-256", enc.encode(material)),
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  )

export const seal = async (
  plain: string,
  material: string,
  context: string,
) => {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const body = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData: enc.encode(context) },
      await importKey(material),
      enc.encode(plain),
    ),
  )
  return `v1:${b64(iv)}:${b64(body)}`
}

/** The plain value, or null for a wrong key, wrong context or damaged value. */
export const open = async (box: string, material: string, context: string) => {
  const [v, iv, body] = box.split(":")
  if (v !== "v1" || !iv || !body) return null
  try {
    return dec.decode(
      await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: unb64(iv), additionalData: enc.encode(context) },
        await importKey(material),
        unb64(body),
      ),
    )
  } catch {
    return null
  }
}

export const encodeVector = (v: Float32Array) =>
  b64(new Uint8Array(v.buffer, v.byteOffset, v.byteLength))

export const decodeVector = (s: string) => {
  const bytes = unb64(s)
  return new Float32Array(
    bytes.buffer,
    bytes.byteOffset,
    Math.floor(bytes.byteLength / 4),
  )
}

export const randomToken = () =>
  b64(crypto.getRandomValues(new Uint8Array(32)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")

export const sha256 = async (text: string) =>
  b64(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(text))))
