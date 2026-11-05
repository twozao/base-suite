import { fail, type RequestEvent } from "@sveltejs/kit"
import type { Permission } from "$lib/permissions"
import { requirePermission } from "./auth/staff"
import { saveSetting, settingsSchema, type SettingKey } from "./settings"
import { audit } from "./audit"

/**
 * Save a structured setting posted as JSON in a `payload` form field. Rich editors (homepage
 * sections, plans, menus) keep their state in the browser and submit it in one piece; the server
 * validates the whole object with the same zod schema used when reading it.
 */
export const saveJsonSetting = async (
  event: RequestEvent,
  key: SettingKey,
  permission: Permission,
  /** Echoed back so pages with several forms know which one responded */
  section?: string,
) => {
  const staff = await requirePermission(event, permission)
  const form = await event.request.formData()
  const raw = String(form.get("payload") ?? "")
  if (raw.length > 200_000)
    return fail(413, { section, error: "Too much content" })
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return fail(400, { section, error: "Invalid form data" })
  }
  const parsed = settingsSchema[key].safeParse(value)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const where = issue.path.length ? `${issue.path.join(" > ")}: ` : ""
    return fail(400, { section, error: `${where}${issue.message}` })
  }
  try {
    await saveSetting(event.locals.db, key, parsed.data as never, staff.userId)
  } catch (e) {
    console.error("saveSetting failed", key, e instanceof Error ? e.message : e)
    return fail(500, { section, error: "Could not save" })
  }
  await audit(event, "settings.updated", { type: "settings", id: key })
  return { section, message: "Saved - live on your site now" }
}
