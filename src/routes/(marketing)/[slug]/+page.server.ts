import { error } from "@sveltejs/kit"
import { requireModule } from "$lib/server/auth/staff"
import { SLUG_RE, RESERVED_SLUGS, publishedPage } from "$lib/server/cms/pages"
import { excerptFrom } from "$lib/server/cms/markdown"
import { typeBy } from "$lib/server/cms/types"
import { archiveEntries } from "$lib/server/cms/entries"
import type { PageServerLoad } from "./$types"
import { alternatesFor, translationOf } from "$lib/server/translations"

// A CMS page, or the list of entries of a content type whose URL prefix is this slug.
export const load: PageServerLoad = async ({ params, locals, url, parent }) => {
  requireModule("cms")
  const slug = params.slug
  if (!SLUG_RE.test(slug) || RESERVED_SLUGS.has(slug)) error(404, "Not found")

  const page = await publishedPage(locals.db, slug)
  if (page) {
    const { site } = await parent()
    if (site.locale !== site.defaultLocale) {
      const tr = await translationOf(locals.db, "page", page.id, site.locale)
      if (tr)
        Object.assign(page, {
          title: tr.title,
          excerpt: tr.excerpt,
          body_html: tr.body_html,
          seo_title: null,
          seo_description: null,
        })
    }
    return {
      alternates: await alternatesFor(
        locals.db,
        "page",
        page.id,
        `/${slug}`,
        site,
      ),
      kind: "page" as const,
      page: {
        title: page.title,
        excerpt: page.excerpt ?? "",
        html: page.body_html,
        template: page.template,
        metaTitle: page.seo_title || page.title,
        metaDescription:
          page.seo_description || page.excerpt || excerptFrom(page.body_html),
        image: page.og_image_url,
        noindex: !!page.seo_noindex,
        updatedAt: page.updated_at,
      },
    }
  }

  const type = await typeBy(locals.db, "url_prefix", slug)
  if (!type || !type.has_archive) error(404, "Not found")
  const pageNo = Math.max(
    1,
    Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1,
  )
  const { entries, total, perPage } = await archiveEntries(
    locals.db,
    type,
    pageNo,
  )
  if (pageNo > 1 && !entries.length) error(404, "Not found")
  return {
    kind: "archive" as const,
    type: {
      name: type.name,
      description: type.description,
      prefix: type.url_prefix,
    },
    entries,
    pageNo,
    pages: Math.max(1, Math.ceil(total / perPage)),
  }
}
