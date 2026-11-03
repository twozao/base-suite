import { fail } from "@sveltejs/kit"
import { requirePermission } from "$lib/server/auth/staff"
import { getSettings, saveSetting } from "$lib/server/settings"
import { audit } from "$lib/server/audit"
import {
  MODULES,
  PLANNED_MODULES,
  activeModules,
  dependentsOf,
  moduleSwitches,
  setModuleSwitches,
  type ModuleId,
} from "$lib/modules"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  await requirePermission(event, "settings.manage")
  const sw = moduleSwitches()
  const active = new Set(activeModules())
  return {
    modules: MODULES.map((m) => ({
      ...m,
      switchedOn: sw[m.id] ?? m.defaultActive,
      active: active.has(m.id),
      blockedBy: m.dependsOn.filter((d) => !active.has(d)),
      dependents: dependentsOf(m.id),
    })),
    planned: PLANNED_MODULES,
  }
}

export const actions: Actions = {
  toggle: async (event) => {
    const staff = await requirePermission(event, "settings.manage")
    const form = await event.request.formData()
    const id = String(form.get("id") ?? "") as ModuleId
    const on = form.get("on") === "true"
    const mod = MODULES.find((m) => m.id === id)
    if (!mod) return fail(400, { error: "Unknown module" })

    const sw = moduleSwitches()
    if (!on) {
      const live = dependentsOf(id).filter((d) => sw[d] ?? true)
      if (live.length) {
        return fail(400, {
          error: `Turn off ${live.join(", ")} first — they need ${mod.name}.`,
        })
      }
    }
    sw[id] = on
    // Turning a module on also turns on what it depends on.
    if (on) for (const d of mod.dependsOn) sw[d] = true

    const db = event.locals.supabaseServiceRole
    const current = await getSettings(db)
    const { error } = await saveSetting(
      db,
      "modules",
      { ...current.modules, switches: sw },
      staff.userId,
    )
    if (error) return fail(500, { error: "Could not save" })
    setModuleSwitches(sw)
    await audit(event, on ? "module.enabled" : "module.disabled", {
      type: "module",
      id,
    })
    return { message: `${mod.name} ${on ? "enabled" : "disabled"}` }
  },
}
