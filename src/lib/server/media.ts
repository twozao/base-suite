import { env } from "$env/dynamic/private"
import { platformBindings } from "./platform"
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
  /^[0-9]{13}-[A-Za-z0-9_-]{8}-[a-z0-9-]{1,70}\.(png|jpg|gif|webp|avif)$/

export const safeBaseName = (filename: string) =>
  (filename.split(/[\\/]/).pop() ?? "")
    .replace(/\.[^.]*$/, "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/g, "") || "image"

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

// Uploads live in the R2 bucket bound as MEDIA on Cloudflare, otherwise on local disk (MEDIA_DIR, default
// data/uploads). Names are unique and validated by MEDIA_NAME_RE, so a path can never leave the directory.
const mediaDir = () => env.MEDIA_DIR || "data/uploads"
const bucket = () => platformBindings().MEDIA
const disk = async () => {
  const [fs, path] = await Promise.all([
    import("node:fs/promises"),
    import("node:path"),
  ])
  return { fs, at: (name: string) => path.join(mediaDir(), name) }
}

export const mediaUrl = (name: string) => `/media/${name}`

export const saveMedia = async (name: string, bytes: Uint8Array) => {
  if (!MEDIA_NAME_RE.test(name)) throw new Error("Invalid media name")
  const b = bucket()
  if (b) {
    const ext = name.slice(name.lastIndexOf(".") + 1)
    await b.put(name, bytes, {
      httpMetadata: { contentType: CONTENT_TYPE_BY_EXT[ext] },
      onlyIf: { etagDoesNotMatch: "*" },
    })
    return
  }
  const { fs, at } = await disk()
  await fs.mkdir(mediaDir(), { recursive: true })
  await fs.writeFile(at(name), bytes, { flag: "wx" })
}

export const deleteMedia = async (name: string) => {
  if (!MEDIA_NAME_RE.test(name)) throw new Error("Invalid media name")
  const b = bucket()
  if (b) return void (await b.delete(name))
  const { fs, at } = await disk()
  await fs.rm(at(name), { force: true })
}

export const readMedia = async (name: string) => {
  if (!MEDIA_NAME_RE.test(name)) return null
  const ext = name.slice(name.lastIndexOf(".") + 1)
  try {
    const b = bucket()
    if (b) {
      const obj = await b.get(name)
      return obj
        ? {
            bytes: new Uint8Array(await obj.arrayBuffer()),
            type: CONTENT_TYPE_BY_EXT[ext],
          }
        : null
    }
    const { fs, at } = await disk()
    return {
      bytes: await fs.readFile(at(name)),
      type: CONTENT_TYPE_BY_EXT[ext],
    }
  } catch {
    return null
  }
}

const LIST_LIMIT = 500

export const listMedia = async () => {
  const b = bucket()
  if (b) {
    const listed = await b.list({ limit: LIST_LIMIT })
    const files = listed.objects
      .filter((o) => MEDIA_NAME_RE.test(o.key))
      .map((o) => ({
        name: o.key,
        size: o.size,
        createdAt: o.uploaded.toISOString(),
        url: mediaUrl(o.key),
      }))
      .sort((x, y) => y.name.localeCompare(x.name))
    return { files, error: null }
  }
  const { fs, at } = await disk()
  let names: string[]
  try {
    names = await fs.readdir(mediaDir())
  } catch {
    return { files: [], error: null }
  }
  const files = await Promise.all(
    names
      .filter((n) => MEDIA_NAME_RE.test(n))
      .sort()
      .reverse()
      .slice(0, LIST_LIMIT)
      .map(async (name) => {
        const s = await fs.stat(at(name))
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

/** Resized copies made at upload are stored as <original stem>-w<width>.webp. */
export const VARIANT_RE = /-w(\d{2,4})\.webp$/

/** Copies an image from an outside address into the media library. Returns the new name or an error. */
export const importImage = async (
  db: import("./db").Db,
  url: string,
): Promise<{ name: string } | { error: string }> => {
  const { fetchPublic } = await import("./security/outbound")
  const { imageSize } = await import("./image_size")
  const r = await fetchPublic(url, {
    maxBytes: MAX_UPLOAD_BYTES,
    timeoutMs: 15_000,
  })
  if (!r.ok) return { error: r.error }
  if (!r.res.ok) return { error: `The address answered ${r.res.status}` }
  const type = detectImageType(r.bytes.slice(0, 16))
  if (!type)
    return { error: "That address is not a PNG, JPEG, WebP, GIF or AVIF image" }
  const base = new URL(url).pathname.split("/").pop() ?? "image"
  const name = `${Date.now()}-${randomToken(6).slice(0, 8)}-${safeBaseName(base)}.${TYPES[type].ext}`
  await saveMedia(name, r.bytes)
  const size = imageSize(r.bytes)
  await db
    .insertInto("media")
    .values({
      name,
      size: r.bytes.byteLength,
      width: size?.width ?? null,
      height: size?.height ?? null,
      source_url: url.slice(0, 1000),
    })
    .onConflict((oc) => oc.column("name").doNothing())
    .execute()
  return { name }
}
