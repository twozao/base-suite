import { error, fail } from "@sveltejs/kit"
import { z } from "zod"
import { blocksOrMarkdown, blocksToText } from "$lib/blocks"
import { LOCALES } from "$lib/i18n"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { audit } from "$lib/server/audit"
import { bumpCacheVersion } from "$lib/server/cache"
import { renderMarkdown } from "$lib/server/cms/markdown"
import { nowIso } from "$lib/server/db/json"
import { isUuid } from "$lib/server/ids"
import { getSettings } from "$lib/server/settings"
import type { Actions, PageServerLoad, RequestEvent } from "./$types"

const guard = async (event: RequestEvent) => {
  requireModule("i18n")
  await requirePermission(event, "translations.manage")
  const { kind, id, locale } = event.params
  if ((kind !== "page" && kind !== "post") || !isUuid(id))
    error(404, "Not found")
  const s = await getSettings(event.locals.db)
  if (!s.i18n.locales.includes(locale) || locale === s.i18n.defaultLocale)
    error(404, "Not a language this site offers")
  const original = await event.locals.db
    .selectFrom(kind === "page" ? "cms_pages" : "posts")
    .select(["id", "title", "excerpt", "slug", "body_md", "blocks_json"])
    .where("id", "=", id)
    .executeTakeFirst()
  if (!original) error(404, "Not found")
  return { kind: kind as "page" | "post", locale, original }
}

export const load: PageServerLoad = async (event) => {
  const { kind, locale, original } = await guard(event)
  const tr = await event.locals.db
    .selectFrom("content_translations")
    .select(["title", "excerpt", "body_md", "published", "updated_at"])
    .where("kind", "=", kind)
    .where("content_id", "=", original.id)
    .where("locale", "=", locale)
    .executeTakeFirst()
  const originalText = blocksToText(
    blocksOrMarkdown(original.blocks_json, original.body_md),
  )
  return {
    kind,
    locale,
    language: LOCALES[locale]?.name ?? locale,
    original: {
      title: original.title,
      excerpt: original.excerpt,
      text: originalText,
      path: kind === "page" ? `/${original.slug}` : `/blog/${original.slug}`,
    },
    tr: tr ?? {
      title: "",
      excerpt: "",
      body_md: "",
      published: 0,
      updated_at: null,
    },
  }
}

export const actions: Actions = {
  default: async (event) => {
    const { kind, locale, original } = await guard(event)
    const fd = await event.request.formData()
    const parsed = z
      .object({
        title: z.string().trim().min(1, "Title is required").max(200),
        excerpt: z.string().trim().max(500),
        body_md: z.string().max(200_000),
      })
      .safeParse({
        title: fd.get("title"),
        excerpt: fd.get("excerpt") ?? "",
        body_md: fd.get("body_md") ?? "",
      })
    if (!parsed.success)
      return fail(400, { error: parsed.error.issues[0].message })
    const row = {
      title: parsed.data.title,
      excerpt: parsed.data.excerpt || null,
      body_md: parsed.data.body_md,
      body_html: renderMarkdown(parsed.data.body_md),
      published: fd.get("published") === "on" ? 1 : 0,
      updated_at: nowIso(),
    }
    await event.locals.db
      .insertInto("content_translations")
      .values({ kind, content_id: original.id, locale, ...row })
      .onConflict((oc) =>
        oc.columns(["kind", "content_id", "locale"]).doUpdateSet(row),
      )
      .execute()
    await bumpCacheVersion(event.locals.db)
    await audit(
      event,
      "translation.saved",
      { type: kind, id: original.id },
      { locale },
    )
    return {
      message: row.published
        ? "Translation saved and live"
        : "Translation saved as a draft",
    }
  },
}
