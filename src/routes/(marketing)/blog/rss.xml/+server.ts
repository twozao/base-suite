import { getSettings } from "$lib/server/settings"
import type { RequestHandler } from "./$types"

const esc = (s: string) =>
  s.replace(
    /[<>&'"]/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        "'": "&apos;",
        '"': "&quot;",
      })[c]!,
  )

export const GET: RequestHandler = async ({ locals, url }) => {
  const s = await getSettings(locals.supabaseServiceRole)
  const { data: posts } = await locals.supabase
    .from("posts")
    .select("slug, title, excerpt, published_at, author_name")
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(50)
  const origin = url.origin
  const items = (posts ?? [])
    .map(
      (p) => `<item>
<title>${esc(p.title)}</title>
<link>${origin}/blog/${p.slug}</link>
<guid isPermaLink="true">${origin}/blog/${p.slug}</guid>
${p.published_at ? `<pubDate>${new Date(p.published_at).toUTCString()}</pubDate>` : ""}
${p.excerpt ? `<description>${esc(p.excerpt)}</description>` : ""}
</item>`,
    )
    .join("\n")
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${esc(s.brand.siteName)} blog</title>
<link>${origin}/blog</link>
<description>${esc(s.brand.description || s.brand.tagline)}</description>
<atom:link href="${origin}/blog/rss.xml" rel="self" type="application/rss+xml" />
${items}
</channel>
</rss>`
  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=600, s-maxage=3600",
    },
  })
}
