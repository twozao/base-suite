import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "../../DatabaseDefinitions"
import { randomToken } from "./security/crypto"

export const MEDIA_BUCKET = "media"
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

// Raster images only. SVG is excluded on purpose: it can carry script.
const TYPES: Record<
  string,
  { ext: string; magic: (b: Uint8Array) => boolean }
> = {
  "image/png": {
    ext: "png",
    magic: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  "image/jpeg": {
    ext: "jpg",
    magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  "image/gif": {
    ext: "gif",
    magic: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46,
  },
  "image/webp": {
    ext: "webp",
    magic: (b) =>
      b[0] === 0x52 &&
      b[1] === 0x49 &&
      b[2] === 0x46 &&
      b[3] === 0x46 &&
      b[8] === 0x57 &&
      b[9] === 0x45 &&
      b[10] === 0x42 &&
      b[11] === 0x50,
  },
  "image/avif": {
    ext: "avif",
    magic: (b) => String.fromCharCode(...b.slice(4, 12)).startsWith("ftypavi"),
  },
}

export const MEDIA_NAME_RE =
  /^[0-9]{13}-[A-Za-z0-9_-]{8}-[a-z0-9-]{1,60}\.(png|jpg|gif|webp|avif)$/

export const safeBaseName = (filename: string) =>
  (filename.split(/[\\/]/).pop() ?? "")
    .replace(/\.[^.]*$/, "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "image"

/** Validate type by content (not by the browser-supplied name/type). */
export const detectImageType = (bytes: Uint8Array) =>
  Object.entries(TYPES).find(([, t]) => t.magic(bytes))?.[0] ?? null

export const validateUpload = async (file: File) => {
  if (file.size === 0) return { error: "Empty file" }
  if (file.size > MAX_UPLOAD_BYTES)
    return { error: "Images must be 5 MB or smaller" }
  const bytes = new Uint8Array(await file.arrayBuffer())
  const type = detectImageType(bytes.slice(0, 16))
  if (!type)
    return { error: "Only PNG, JPEG, WebP, GIF and AVIF images are allowed" }
  const name = `${Date.now()}-${randomToken(6).slice(0, 8)}-${safeBaseName(file.name)}.${TYPES[type].ext}`
  return { bytes, type, name }
}

export const listMedia = async (db: SupabaseClient<Database>) => {
  const { data, error } = await db.storage.from(MEDIA_BUCKET).list("", {
    limit: 500,
    sortBy: { column: "name", order: "desc" },
  })
  if (error) return { files: [], error: error.message }
  const files = (data ?? [])
    .filter((f) => MEDIA_NAME_RE.test(f.name))
    .map((f) => ({
      name: f.name,
      size: (f.metadata as { size?: number } | null)?.size ?? null,
      createdAt: f.created_at ?? null,
      url: db.storage.from(MEDIA_BUCKET).getPublicUrl(f.name).data.publicUrl,
    }))
  return { files, error: null }
}
