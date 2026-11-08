import { error } from "@sveltejs/kit"
import { requireModule } from "$lib/server/auth/staff"
import { SLUG_RE } from "$lib/server/cms/pages"
import { typeBy } from "$lib/server/cms/types"
import { publishedEntry } from "$lib/server/cms/entries"
import { excerptFrom } from "$lib/server/cms/markdown"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ params, locals }) => {
  requireModule("cms")
  if (!SLUG_RE.test(params.slug) || !SLUG_RE.test(params.entry))
    error(404, "Not found")
  const type = await typeBy(locals.db, "url_prefix", params.slug)
  if (!type) error(404, "Not found")
  const entry = await publishedEntry(locals.db, type, params.entry)
  if (!entry) error(404, "Not found")
  return {
    type: {
      name: type.name,
      prefix: type.url_prefix,
      hasArchive: type.has_archive,
    },
    entry: {
      title: entry.title,
      excerpt: entry.excerpt,
      hero: entry.hero,
      fields: entry.fields,
      html: entry.body_html,
      metaTitle: entry.seo_title || entry.title,
      metaDescription:
        entry.seo_description || entry.excerpt || excerptFrom(entry.body_html),
      image: entry.og_image_url || entry.hero,
      noindex: !!entry.seo_noindex,
    },
  }
}
