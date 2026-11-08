import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto"

// AES-256-GCM for values stored in the database. The context is authenticated, so a value
// cannot be moved to another field without failing to open.
export const keyFrom = (material: string | Buffer) =>
  createHash("sha256").update(material).digest()

export const seal = (plain: string, key: Buffer, context: string): string => {
  const iv = randomBytes(12)
  const c = createCipheriv("aes-256-gcm", key, iv).setAAD(Buffer.from(context))
  const body = Buffer.concat([c.update(plain, "utf8"), c.final()])
  return ["v1", iv, c.getAuthTag(), body]
    .map((p) => (typeof p === "string" ? p : p.toString("base64")))
    .join(":")
}

/** The plain value, or null for a wrong key, wrong context or damaged value. */
export const open = (
  box: string,
  key: Buffer,
  context: string,
): string | null => {
  const [version, iv, tag, body] = box.split(":")
  if (version !== "v1" || !iv || !tag || body === undefined) return null
  try {
    const d = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(iv, "base64"),
    ).setAAD(Buffer.from(context))
    d.setAuthTag(Buffer.from(tag, "base64"))
    return Buffer.concat([
      d.update(Buffer.from(body, "base64")),
      d.final(),
    ]).toString("utf8")
  } catch {
    return null
  }
}
