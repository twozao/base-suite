import { fail } from "@sveltejs/kit"
import { requirePermission } from "$lib/server/auth/staff"
import { audit } from "$lib/server/audit"
import {
  listMedia,
  MEDIA_BUCKET,
  MEDIA_NAME_RE,
  validateUpload,
} from "$lib/server/media"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  await requirePermission(event, "cms.edit")
  return await listMedia(event.locals.supabaseServiceRole)
}

export const actions: Actions = {
  upload: async (event) => {
    await requirePermission(event, "cms.edit")
    const form = await event.request.formData()
    const files = form
      .getAll("files")
      .filter((f): f is File => f instanceof File && f.size > 0)
      .slice(0, 10)
    if (!files.length) return fail(400, { error: "Choose at least one image" })
    const db = event.locals.supabaseServiceRole
    const uploaded: string[] = []
    for (const file of files) {
      const v = await validateUpload(file)
      if ("error" in v && v.error)
        return fail(400, { error: `${file.name}: ${v.error}`, uploaded })
      const { bytes, type, name } = v as {
        bytes: Uint8Array
        type: string
        name: string
      }
      const { error } = await db.storage
        .from(MEDIA_BUCKET)
        .upload(name, bytes, {
          contentType: type,
          cacheControl: "31536000",
          upsert: false,
        })
      if (error)
        return fail(500, { error: `Upload failed: ${error.message}`, uploaded })
      uploaded.push(name)
    }
    await audit(
      event,
      "media.uploaded",
      { type: "media", id: uploaded[0] },
      { count: uploaded.length },
    )
    return {
      message: `Uploaded ${uploaded.length} image${uploaded.length === 1 ? "" : "s"}`,
      uploaded,
    }
  },
  delete: async (event) => {
    await requirePermission(event, "cms.edit")
    const name = String((await event.request.formData()).get("name") ?? "")
    if (!MEDIA_NAME_RE.test(name)) return fail(400, { error: "Invalid file" })
    const { error } = await event.locals.supabaseServiceRole.storage
      .from(MEDIA_BUCKET)
      .remove([name])
    if (error) return fail(500, { error: "Could not delete" })
    await audit(event, "media.deleted", { type: "media", id: name })
    return { message: "Deleted" }
  },
}
