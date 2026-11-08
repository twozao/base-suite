import { addHook, runHeadHooks } from "./hooks"
import type { Db } from "../db"
import { getSettings } from "../settings"

// Structured data from the SEO pack: who runs the site, and where this page sits in it.

addHook("page.head", ({ url, siteName, logoUrl, trail }) => {
  const origin = url.origin
  const org: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    url: origin,
    ...(logoUrl
      ? { logo: logoUrl.startsWith("/") ? origin + logoUrl : logoUrl }
      : {}),
  }
  const out: Record<string, unknown>[] = [org]
  if (trail.length > 1)
    out.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: trail.map((t, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: t.name,
        item: origin + t.path,
      })),
    })
  return out
})

const words = (s: string) =>
  decodeURIComponent(s)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())

/** JSON-LD for a public page when the SEO pack is on; an empty list otherwise. */
export const structuredData = async (db: Db, url: URL) => {
  const s = await getSettings(db)
  if (!s.seo.structuredData) return []
  const parts = url.pathname.split("/").filter(Boolean).slice(0, 5)
  const trail = [
    { name: "Home", path: "/" },
    ...parts.map((p, i) => ({
      name: words(p),
      path: "/" + parts.slice(0, i + 1).join("/"),
    })),
  ]
  return runHeadHooks({
    db,
    url,
    siteName: s.brand.siteName,
    logoUrl: s.brand.logoUrl || null,
    trail,
  })
}
