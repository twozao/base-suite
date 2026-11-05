import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { env } from "$env/dynamic/private"
import { randomToken } from "./security/crypto"

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

const CONTENT_TYPE_BY_EXT: Record<string, string> = Object.fromEntries(
  Object.entries(TYPES).map(([type, t]) => [t.ext, type]),
)

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

// Uploads live on local disk (MEDIA_DIR, default data/uploads) and are served by /media/<name>.
// Names are unique and validated by MEDIA_NAME_RE, so a path can never leave the directory.
const mediaDir = () => env.MEDIA_DIR || "data/uploads"

export const mediaUrl = (name: string) => `/media/${name}`

export const saveMedia = async (name: string, bytes: Uint8Array) => {
  if (!MEDIA_NAME_RE.test(name)) throw new Error("Invalid media name")
  await mkdir(mediaDir(), { recursive: true })
  await writeFile(join(mediaDir(), name), bytes, { flag: "wx" })
}

export const deleteMedia = async (name: string) => {
  if (!MEDIA_NAME_RE.test(name)) throw new Error("Invalid media name")
  await rm(join(mediaDir(), name), { force: true })
}

export const readMedia = async (name: string) => {
  if (!MEDIA_NAME_RE.test(name)) return null
  try {
    const bytes = await readFile(join(mediaDir(), name))
    const ext = name.slice(name.lastIndexOf(".") + 1)
    return { bytes, type: CONTENT_TYPE_BY_EXT[ext] }
  } catch {
    return null
  }
}

export const listMedia = async () => {
  let names: string[]
  try {
    names = await readdir(mediaDir())
  } catch {
    return { files: [], error: null }
  }
  const files = await Promise.all(
    names
      .filter((n) => MEDIA_NAME_RE.test(n))
      .sort()
      .reverse()
      .slice(0, 500)
      .map(async (name) => {
        const s = await stat(join(mediaDir(), name))
        return {
          name,
          size: s.size,
          createdAt: s.mtime.toISOString(),
          url: mediaUrl(name),
        }
      }),
  )
  return { files, error: null }
}
