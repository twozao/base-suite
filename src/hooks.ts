import type { Reroute } from "@sveltejs/kit"
import { splitLocale } from "$lib/i18n"

// /fr/about is served by the /about route; the page reads the language from the address.
export const reroute: Reroute = ({ url }) => {
  const { locale, path } = splitLocale(url.pathname)
  if (locale) return path
}
