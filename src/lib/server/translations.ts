import { LOCALES, localizeHref, splitLocale } from "$lib/i18n"
import type { Navigation } from "$lib/site"
import type { Db } from "./db"
import { isModuleEnabled } from "$lib/modules"
import { getSettings } from "./settings"

// Multilingual sites: /fr/about shows the French translation of /about. Content is translated per page
// and post; menu labels per language. Anything without a translation falls back to the default language.

export type LocaleInfo = {
  locale: string
  defaultLocale: string
  locales: { code: string; name: string }[]
  rtl: boolean
  active: boolean
}

/** The language for this address, or null when the prefix is not one the site offers (a 404). */
export const localeFor = async (
  db: Db,
  url: URL,
): Promise<LocaleInfo | null> => {
  const s = (await getSettings(db)).i18n
  const active = isModuleEnabled("i18n") && s.locales.length > 1
  const { locale } = splitLocale(url.pathname)
  if (
    locale &&
    (!active || !s.locales.includes(locale) || locale === s.defaultLocale)
  )
    return null
  const current = locale ?? s.defaultLocale
  return {
    locale: current,
    defaultLocale: s.defaultLocale,
    locales: active
      ? s.locales.map((code) => ({ code, name: LOCALES[code]?.name ?? code }))
      : [],
    rtl: !!LOCALES[current]?.rtl,
    active,
  }
}

/** Menu labels for a language, as { original label: translation }. */
export const navLabels = async (db: Db, locale: string) => {
  const row = await db
    .selectFrom("site_translations")
    .select("value")
    .where("locale", "=", locale)
    .where("area", "=", "navigation")
    .executeTakeFirst()
  try {
    return row ? (JSON.parse(row.value) as Record<string, string>) : {}
  } catch {
    return {}
  }
}

/** The menus with translated labels and links that keep the language. */
export const translateNavigation = (
  nav: Navigation,
  labels: Record<string, string>,
  locale: string,
  defaultLocale: string,
): Navigation => {
  const tr = (l: string) => labels[l] || l
  const href = (h: string) => localizeHref(h, locale, defaultLocale)
  return {
    ...nav,
    header: nav.header.map((l) => ({
      ...l,
      label: tr(l.label),
      href: href(l.href),
    })),
    ctaLabel: tr(nav.ctaLabel),
    ctaHref: nav.ctaHref ? href(nav.ctaHref) : nav.ctaHref,
    footerColumns: nav.footerColumns.map((c) => ({
      ...c,
      title: tr(c.title),
      links: c.links.map((l) => ({
        ...l,
        label: tr(l.label),
        href: href(l.href),
      })),
    })),
    footerNote: tr(nav.footerNote),
  }
}

/** A published translation of a page or post. */
export const translationOf = (
  db: Db,
  kind: "page" | "post",
  id: string,
  locale: string,
) =>
  db
    .selectFrom("content_translations")
    .select(["title", "excerpt", "body_html"])
    .where("kind", "=", kind)
    .where("content_id", "=", id)
    .where("locale", "=", locale)
    .where("published", "=", 1)
    .executeTakeFirst()

/** Languages a page or post is published in, for hreflang links. */
export const translatedLocales = async (
  db: Db,
  kind: "page" | "post",
  id: string,
) =>
  (
    await db
      .selectFrom("content_translations")
      .select("locale")
      .where("kind", "=", kind)
      .where("content_id", "=", id)
      .where("published", "=", 1)
      .execute()
  ).map((r) => r.locale)

export { splitLocale }

/** hreflang links: the default language plus every published translation. */
export const alternatesFor = async (
  db: Db,
  kind: "page" | "post",
  id: string,
  path: string,
  site: { defaultLocale: string; locales: { code: string }[] },
) => {
  if (site.locales.length < 2) return []
  const langs = new Set(await translatedLocales(db, kind, id))
  return [
    { code: site.defaultLocale, href: path },
    ...site.locales
      .filter((l) => l.code !== site.defaultLocale && langs.has(l.code))
      .map((l) => ({
        code: l.code,
        href: localizeHref(path, l.code, site.defaultLocale),
      })),
  ]
}
