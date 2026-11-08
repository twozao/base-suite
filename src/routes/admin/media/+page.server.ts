import { fail } from "@sveltejs/kit"
import { z } from "zod"
import { requirePermission } from "$lib/server/auth/staff"
import { audit } from "$lib/server/audit"
import { imageSize } from "$lib/server/image_size"
import { variantName } from "$lib/server/cms/blocks"
import {
  deleteMedia,
  detectImageType,
  importImage,
  MEDIA_NAME_RE,
  saveMedia,
  validateUpload,
} from "$lib/server/media"
import { mediaLibrary } from "$lib/server/media_library"
import type { Actions, PageServerLoad } from "./$types"

const WIDTHS = [480, 960, 1600]

export const load: PageServerLoad = async (event) => {
  await requirePermission(event, "cms.write")
  return mediaLibrary(event.locals.db)
}

export const actions: Actions = {
  // Each file may come with resized WebP copies made in the browser (variant_<index>_<width>).
  upload: async (event) => {
    await requirePermission(event, "cms.write")
    const form = await event.request.formData()
    const files = form
      .getAll("files")
      .filter((f): f is File => f instanceof File && f.size > 0)
      .slice(0, 10)
    if (!files.length) return fail(400, { error: "Choose at least one image" })
    const uploaded: string[] = []
    for (const [i, file] of files.entries()) {
      const v = await validateUpload(file)
      if ("error" in v)
        return fail(400, { error: `${file.name}: ${v.error}`, uploaded })
      const size = imageSize(v.bytes)
      const variants: number[] = []
      try {
        await saveMedia(v.name, v.bytes)
        for (const w of WIDTHS) {
          const part = form.get(`variant_${i}_${w}`)
          if (!(part instanceof File) || !size || w >= size.width) continue
          const bytes = new Uint8Array(await part.arrayBuffer())
          if (
            bytes.byteLength > 5 * 1024 * 1024 ||
            detectImageType(bytes.slice(0, 16)) !== "image/webp"
          )
            continue
          await saveMedia(variantName(v.name, w), bytes)
          variants.push(w)
        }
      } catch (e) {
        console.error("media upload failed", e instanceof Error ? e.message : e)
        return fail(500, { error: `${file.name}: upload failed`, uploaded })
      }
      await event.locals.db
        .insertInto("media")
        .values({
          name: v.name,
          size: v.bytes.byteLength,
          width: size?.width ?? null,
          height: size?.height ?? null,
          variants: JSON.stringify(variants),
        })
        .execute()
      uploaded.push(v.name)
    }
    await audit(
      event,
      "media.uploaded",
      { type: "media", id: uploaded[0] },
      { count: uploaded.length },
    )
    return {
      message: `Uploaded ${uploaded.length} image${uploaded.length === 1 ? "" : "s"}. Add alt text below.`,
      uploaded,
    }
  },

  import: async (event) => {
    await requirePermission(event, "cms.write")
    const url = String((await event.request.formData()).get("url") ?? "").trim()
    if (!url) return fail(400, { error: "Paste an image address" })
    const r = await importImage(event.locals.db, url)
    if ("error" in r) return fail(400, { error: r.error })
    await audit(event, "media.imported", { type: "media", id: r.name })
    return { message: "Image copied into Media", uploaded: [r.name] }
  },

  update: async (event) => {
    await requirePermission(event, "cms.write")
    const form = await event.request.formData()
    const parsed = z
      .object({
        name: z.string().regex(MEDIA_NAME_RE),
        alt: z.string().trim().max(300),
        focal_x: z.coerce.number().int().min(0).max(100),
        focal_y: z.coerce.number().int().min(0).max(100),
      })
      .safeParse(Object.fromEntries(form))
    if (!parsed.success) return fail(400, { error: "Invalid details" })
    const { name, ...rest } = parsed.data
    await event.locals.db
      .insertInto("media")
      .values({ name, ...rest })
      .onConflict((oc) => oc.column("name").doUpdateSet(rest))
      .execute()
    await audit(event, "media.updated", { type: "media", id: name })
    return { message: "Saved" }
  },

  delete: async (event) => {
    await requirePermission(event, "cms.edit")
    const name = String((await event.request.formData()).get("name") ?? "")
    if (!MEDIA_NAME_RE.test(name)) return fail(400, { error: "Invalid file" })
    const db = event.locals.db
    const row = await db
      .selectFrom("media")
      .select("variants")
      .where("name", "=", name)
      .executeTakeFirst()
    try {
      await deleteMedia(name)
      for (const w of row ? (JSON.parse(row.variants) as number[]) : [])
        await deleteMedia(variantName(name, w))
    } catch (e) {
      console.error("media delete failed", e instanceof Error ? e.message : e)
      return fail(500, { error: "Could not delete" })
    }
    await db.deleteFrom("media").where("name", "=", name).execute()
    await audit(event, "media.deleted", { type: "media", id: name })
    return { message: "Deleted" }
  },
}
