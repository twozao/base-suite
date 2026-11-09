import { fail } from "@sveltejs/kit"
import { requirePermission } from "$lib/server/auth/staff"
import { audit } from "$lib/server/audit"
import { bumpCacheVersion } from "$lib/server/cache"
import { CATALOGUE } from "$lib/server/plugins/catalogue"
import {
  installExtension,
  manifestSchema,
  parseManifest,
  uninstallExtension,
} from "$lib/server/plugins/extensions"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  await requirePermission(event, "plugins.manage")
  const installed = await event.locals.db
    .selectFrom("extensions")
    .select(["id", "name", "version", "manifest_json", "installed_at"])
    .orderBy("name")
    .execute()
  const ids = new Set(installed.map((i) => i.id))
  return {
    installed: installed.map((i) => {
      const m = JSON.parse(i.manifest_json)
      return {
        id: i.id,
        name: i.name,
        version: i.version,
        description: m.description as string,
        installed_at: i.installed_at,
        builtIn: CATALOGUE.some((c) => c.id === i.id),
      }
    }),
    available: CATALOGUE.filter((c) => !ids.has(String(c.id))).map((c) => {
      const m = manifestSchema.parse(c)
      return {
        id: m.id,
        name: m.name,
        description: m.description,
        adds: [
          ...m.contentTypes.map((t) => `${t.name} at /${t.url_prefix}`),
          ...m.blocks.map((b) => `Block: ${b.name}`),
          ...m.emailTemplates.map((t) => `Email: ${t.name}`),
          ...(m.settings.seo ? ["Structured data"] : []),
        ],
      }
    }),
  }
}

export const actions: Actions = {
  install: async (event) => {
    const staff = await requirePermission(event, "plugins.manage")
    const form = await event.request.formData()
    const id = String(form.get("id") ?? "")
    const file = form.get("file")
    let manifest
    if (file instanceof File && file.size) {
      manifest = parseManifest(await file.text())
    } else {
      const found = CATALOGUE.find((c) => c.id === id)
      if (!found) return fail(400, { error: "Unknown extension" })
      manifest = parseManifest(JSON.stringify(found))
    }
    if ("error" in manifest) return fail(400, { error: manifest.error })
    const r = await installExtension(event.locals.db, manifest, staff.userId)
    if ("error" in r)
      return fail(400, { error: r.error ?? "Could not install" })
    await bumpCacheVersion(event.locals.db)
    await audit(
      event,
      "extension.installed",
      { type: "extension", id: manifest.id },
      { version: manifest.version },
    )
    return { message: `${manifest.name} installed` }
  },
  uninstall: async (event) => {
    const staff = await requirePermission(event, "plugins.manage")
    const form = await event.request.formData()
    const id = String(form.get("id") ?? "")
    const keep = form.get("keep") === "1"
    const r = await uninstallExtension(event.locals.db, id, keep, staff.userId)
    if ("error" in r) return fail(400, { error: r.error ?? "Could not remove" })
    await bumpCacheVersion(event.locals.db)
    await audit(
      event,
      "extension.uninstalled",
      { type: "extension", id },
      { keepContent: keep },
    )
    return {
      message: keep
        ? "Removed. Its content types and entries are kept as your own."
        : "Removed with everything it added",
    }
  },
}
