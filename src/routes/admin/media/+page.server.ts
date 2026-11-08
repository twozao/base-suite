import { fail } from "@sveltejs/kit"
import { requirePermission } from "$lib/server/auth/staff"
import { audit } from "$lib/server/audit"
import {
  deleteMedia,
  listMedia,
  MEDIA_NAME_RE,
  saveMedia,
  validateUpload,
} from "$lib/server/media"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  await requirePermission(event, "cms.edit")
  return await listMedia()
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
    const uploaded: string[] = []
    for (const file of files) {
      const v = await validateUpload(file)
      if ("error" in v)
        return fail(400, { error: `${file.name}: ${v.error}`, uploaded })
      try {
        await saveMedia(v.name, v.bytes)
      } catch (e) {
        console.error("media upload failed", e instanceof Error ? e.message : e)
        return fail(500, { error: `${file.name}: upload failed`, uploaded })
      }
      uploaded.push(v.name)
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
    try {
      await deleteMedia(name)
    } catch (e) {
      console.error("media delete failed", e instanceof Error ? e.message : e)
      return fail(500, { error: "Could not delete" })
    }
    await audit(event, "media.deleted", { type: "media", id: name })
    return { message: "Deleted" }
  },
}
