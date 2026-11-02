import { fail } from "@sveltejs/kit"
import { requirePermission } from "$lib/server/auth/staff"
import {
  getSettings,
  saveSetting,
  settingsSchema,
  type SettingKey,
} from "$lib/server/settings"
import { audit } from "$lib/server/audit"
import { isModuleEnabled } from "$lib/modules"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  await requirePermission(event, "settings.manage")
  return {
    settings: await getSettings(event.locals.supabaseServiceRole),
    modules: {
      chat: isModuleEnabled("chat"),
      booking: isModuleEnabled("booking"),
      contact: isModuleEnabled("contact"),
    },
  }
}

const bool = (f: FormData, k: string) => f.get(k) === "on"
const str = (f: FormData, k: string) => String(f.get(k) ?? "")

const save = async (
  event: Parameters<Actions[string]>[0],
  key: SettingKey,
  raw: unknown,
) => {
  const staff = await requirePermission(event, "settings.manage")
  const parsed = settingsSchema[key].safeParse(raw)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return fail(400, {
      section: key,
      error: `${issue.path.join(".") || key}: ${issue.message}`,
    })
  }
  // Value was validated against this key's schema just above.
  const { error } = await saveSetting(
    event.locals.supabaseServiceRole,
    key,
    parsed.data as never,
    staff.userId,
  )
  if (error)
    return fail(500, { section: key, error: "Could not save settings" })
  await audit(event, "settings.updated", { type: "settings", id: key })
  return { section: key, message: "Saved" }
}

export const actions: Actions = {
  general: async (event) => {
    const f = await event.request.formData()
    return save(event, "general", {
      supportEmail: str(f, "supportEmail"),
      announcement: str(f, "announcement"),
    })
  },
  chat: async (event) => {
    const f = await event.request.formData()
    return save(event, "chat", {
      enabled: bool(f, "enabled"),
      greeting: str(f, "greeting"),
      offlineMessage: str(f, "offlineMessage"),
      requireEmail: bool(f, "requireEmail"),
      notifyAdminOnNew: bool(f, "notifyAdminOnNew"),
    })
  },
  booking: async (event) => {
    const f = await event.request.formData()
    const labels = f.getAll("et_label").map(String)
    const eventTypes = labels
      .map((label, i) => ({
        label,
        description: String(f.getAll("et_description")[i] ?? ""),
        durationMinutes: Number(f.getAll("et_duration")[i] ?? 30),
        url: String(f.getAll("et_url")[i] ?? "").trim(),
      }))
      .filter((t) => t.label.trim() || t.url)
    return save(event, "booking", {
      enabled: bool(f, "enabled"),
      intro: str(f, "intro"),
      eventTypes,
    })
  },
  contact: async (event) => {
    const f = await event.request.formData()
    return save(event, "contact", {
      notifyAdmin: bool(f, "notifyAdmin"),
      successMessage: str(f, "successMessage"),
    })
  },
}
