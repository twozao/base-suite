// Languages a site can offer. A fixed list, so URLs can be routed before any settings load
// and these codes can be reserved as page addresses.
export const LOCALES: Record<string, { name: string; rtl?: boolean }> = {
  en: { name: "English" },
  fr: { name: "Francais" },
  de: { name: "Deutsch" },
  es: { name: "Espanol" },
  it: { name: "Italiano" },
  pt: { name: "Portugues" },
  nl: { name: "Nederlands" },
  sv: { name: "Svenska" },
  pl: { name: "Polski" },
  tr: { name: "Turkce" },
  ar: { name: "Arabic", rtl: true },
  he: { name: "Hebrew", rtl: true },
  hi: { name: "Hindi" },
  ta: { name: "Tamil" },
  ja: { name: "Japanese" },
  ko: { name: "Korean" },
  zh: { name: "Chinese" },
}
export const LOCALE_CODES = Object.keys(LOCALES)

const PREFIX = new RegExp(`^/(${LOCALE_CODES.join("|")})(/.*)?$`)
/** Areas with no translated URLs: they stay at one address whatever the language. */
const UNLOCALIZED =
  /^\/(admin|account|login|auth|api|media|_app|samples|book\/manage|ticket)(\/|$)/

/** Splits /fr/about into its language and the page's real path. */
export const splitLocale = (
  pathname: string,
): { locale: string | null; path: string } => {
  const m = PREFIX.exec(pathname)
  if (!m) return { locale: null, path: pathname }
  const path = m[2] || "/"
  if (UNLOCALIZED.test(path)) return { locale: null, path: pathname }
  return { locale: m[1], path }
}

/** Adds the language to an internal link. Full URLs, anchors, files and account areas are left alone. */
export const localizeHref = (
  href: string,
  locale: string | null | undefined,
  defaultLocale: string,
) => {
  if (!locale || locale === defaultLocale) return href
  if (
    !href.startsWith("/") ||
    href.startsWith("//") ||
    UNLOCALIZED.test(href) ||
    /\.[a-z0-9]+($|\?)/i.test(href)
  )
    return href
  if (href === "/") return `/${locale}`
  return `/${locale}${href}`
}

/** A label from the site's UI translations, or the English default. */
export const t = (ui: Record<string, string> | undefined, text: string) =>
  ui?.[text] || text
