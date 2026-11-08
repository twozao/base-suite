import { fail } from "@sveltejs/kit"
import { requirePermission } from "$lib/server/auth/staff"
import { audit } from "$lib/server/audit"
import { restoreSite } from "$lib/server/backup"
import { bumpCacheVersion } from "$lib/server/cache"
import type { Actions, PageServerLoad } from "./$types"

const MAX_BYTES = 25 * 1024 * 1024

export const load: PageServerLoad = async (event) => {
  await requirePermission(event, "settings.manage")
  return { cloudflare: __CLOUDFLARE__ }
}

export const actions: Actions = {
  restore: async (event) => {
    await requirePermission(event, "settings.manage")
    const fd = await event.request.formData()
    if (fd.get("confirm") !== "RESTORE")
      return fail(400, { error: "Type RESTORE to confirm" })
    const file = fd.get("file")
    if (!(file instanceof File) || !file.size)
      return fail(400, { error: "Choose a backup file" })
    if (file.size > MAX_BYTES)
      return fail(400, { error: "The file is larger than 25 MB" })
    const r = await restoreSite(event.locals.db, await file.text())
    if ("error" in r) return fail(400, { error: r.error })
    await bumpCacheVersion(event.locals.db)
    await audit(
      event,
      "backup.restored",
      { type: "backup", id: file.name.slice(0, 100) },
      r.counts,
    )
    const total = Object.values(r.counts).reduce((a, b) => a + b, 0)
    return { message: `Restored ${total} items` }
  },
}
