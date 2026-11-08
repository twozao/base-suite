import { fail } from "@sveltejs/kit"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { audit } from "$lib/server/audit"
import { LOCALES, LOCALE_CODES } from "$lib/i18n"
import { getSettings, saveSetting } from "$lib/server/settings"
import { navLabels } from "$lib/server/translations"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  requireModule("i18n")
  await requirePermission(event, "translations.manage")
  const db = event.locals.db
  const s = await getSettings(db)
  const others = s.i18n.locales.filter((l) => l !== s.i18n.defaultLocale)
  const [pages, posts, rows] = await Promise.all([
    db
      .selectFrom("cms_pages")
      .select(["id", "title", "slug"])
      .where("status", "=", "published")
      .orderBy("title")
      .execute(),
    db
      .selectFrom("posts")
      .select(["id", "title", "slug"])
      .where("status", "=", "published")
      .orderBy("published_at", "desc")
      .limit(200)
      .execute(),
    db
      .selectFrom("content_translations")
      .select(["kind", "content_id", "locale", "published"])
      .execute(),
  ])
  const status = (kind: string, id: string) =>
    Object.fromEntries(
      others.map((l) => [
        l,
        rows.find(
          (r) => r.kind === kind && r.content_id === id && r.locale === l,
        )?.published
          ? "live"
          : rows.some(
                (r) => r.kind === kind && r.content_id === id && r.locale === l,
              )
            ? "draft"
            : "none",
      ]),
    )
  const labels = [
    ...new Set(
      [
        ...s.navigation.header.map((l) => l.label),
        s.navigation.ctaLabel,
        ...s.navigation.footerColumns.flatMap((c) => [
          c.title,
          ...c.links.map((l) => l.label),
        ]),
        s.navigation.footerNote,
      ].filter(Boolean),
    ),
  ]
  const menus = Object.fromEntries(
    await Promise.all(
      others.map(async (l) => [l, await navLabels(db, l)] as const),
    ),
  )
  return {
    i18n: s.i18n,
    all: LOCALE_CODES.map((code) => ({ code, name: LOCALES[code].name })),
    others,
    items: [
      ...pages.map((p) => ({
        ...p,
        kind: "page" as const,
        status: status("page", p.id),
      })),
      ...posts.map((p) => ({
        ...p,
        kind: "post" as const,
        status: status("post", p.id),
      })),
    ],
    labels,
    menus,
  }
}

export const actions: Actions = {
  languages: async (event) => {
    requireModule("i18n")
    const staff = await requirePermission(event, "settings.manage")
    const fd = await event.request.formData()
    const def = String(fd.get("defaultLocale") ?? "")
    const locales = [...new Set([def, ...fd.getAll("locales").map(String)])]
      .filter((l) => LOCALE_CODES.includes(l))
      .slice(0, 10)
    if (!LOCALE_CODES.includes(def))
      return fail(400, { error: "Pick a main language" })
    await saveSetting(
      event.locals.db,
      "i18n",
      { defaultLocale: def, locales },
      staff.userId,
    )
    await audit(event, "settings.updated", { type: "settings", id: "i18n" })
    return { message: "Languages saved" }
  },
  menu: async (event) => {
    requireModule("i18n")
    await requirePermission(event, "translations.manage")
    const fd = await event.request.formData()
    const locale = String(fd.get("locale") ?? "")
    if (!LOCALE_CODES.includes(locale))
      return fail(400, { error: "Unknown language" })
    const map: Record<string, string> = {}
    for (const [k, v] of fd.entries()) {
      if (!k.startsWith("label:")) continue
      const val = String(v).trim().slice(0, 200)
      if (val) map[k.slice(6, 206)] = val
    }
    const value = JSON.stringify(map)
    await event.locals.db
      .insertInto("site_translations")
      .values({ locale, area: "navigation", value })
      .onConflict((oc) => oc.columns(["locale", "area"]).doUpdateSet({ value }))
      .execute()
    await audit(event, "translation.saved", { type: "navigation", id: locale })
    return { message: "Menu labels saved" }
  },
}
