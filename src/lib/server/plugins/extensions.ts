import { z } from "zod"
import { blocksSchema } from "$lib/blocks"
import type { Db } from "../db"
import { nowIso } from "../db/json"
import { bodyFrom } from "../cms/content"
import { RESERVED_SLUGS, SLUG_RE } from "../cms/pages"
import { cleanFieldValues, fieldListSchema } from "../cms/types"
import {
  emailTemplateSchema,
  isSensitiveTemplate,
  saveTemplate,
} from "../email"
import { fromPathSchema, invalidateRedirects, toUrlSchema } from "../redirects"
import { getSettings, saveSetting } from "../settings"

// Extensions add features without code: a JSON package of content types, reusable blocks, sample
// entries, email templates, redirects and setting switches. Everything is validated, and everything it adds carries its
// id, so uninstalling removes exactly that.

export const manifestSchema = z.object({
  id: z
    .string()
    .regex(
      /^[a-z0-9][a-z0-9-]{1,59}$/,
      "Extension id: lowercase letters, numbers and dashes",
    ),
  name: z.string().trim().min(1).max(120),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Version like 1.0.0"),
  description: z.string().trim().max(500).default(""),
  author: z.string().trim().max(120).default(""),
  contentTypes: z
    .array(
      z.object({
        slug: z.string().regex(/^[a-z][a-z0-9_-]{0,59}$/),
        name: z.string().trim().min(1).max(80),
        singular: z.string().trim().min(1).max(80),
        url_prefix: z
          .string()
          .max(60)
          .regex(SLUG_RE)
          .refine((s) => !RESERVED_SLUGS.has(s), "Reserved URL"),
        description: z.string().trim().max(500).default(""),
        has_archive: z.boolean().default(true),
        in_search: z.boolean().default(true),
        fields: fieldListSchema,
      }),
    )
    .max(10)
    .default([]),
  entries: z
    .array(
      z.object({
        type: z.string(),
        slug: z.string().regex(SLUG_RE).max(100),
        title: z.string().trim().min(1).max(200),
        excerpt: z.string().trim().max(500).default(""),
        fields: z
          .record(
            z.string(),
            z.union([z.string().max(5000), z.number(), z.boolean(), z.null()]),
          )
          .default({}),
        blocks: blocksSchema.default([]),
        status: z.enum(["draft", "published"]).default("draft"),
      }),
    )
    .max(50)
    .default([]),
  blocks: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        blocks: blocksSchema,
      }),
    )
    .max(20)
    .default([]),
  emailTemplates: z
    .array(emailTemplateSchema)
    .max(30)
    .refine((list) => !list.some((t) => isSensitiveTemplate(t.slug)), {
      message: "Sign-in and password emails can only be changed in the admin",
    })
    .default([]),
  redirects: z
    .array(
      z.object({
        from: fromPathSchema,
        to: toUrlSchema,
        code: z.union([z.literal(301), z.literal(302)]).default(301),
      }),
    )
    .max(200)
    .default([]),
  settings: z
    .object({ seo: z.object({ structuredData: z.boolean() }).optional() })
    .default({}),
})
export type Manifest = z.output<typeof manifestSchema>

const MAX_MANIFEST_BYTES = 200 * 1024

export const parseManifest = (text: string): Manifest | { error: string } => {
  if (text.length > MAX_MANIFEST_BYTES)
    return { error: "The package is larger than 200 KB" }
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { error: "The package is not valid JSON" }
  }
  const r = manifestSchema.safeParse(json)
  if (!r.success) {
    const i = r.error.issues[0]
    return { error: `${i.path.join(".") || "package"}: ${i.message}` }
  }
  for (const e of r.data.entries)
    if (!r.data.contentTypes.some((t) => t.slug === e.type))
      return { error: `Entry ${e.slug} uses an unknown type ${e.type}` }
  return r.data
}

/** What would clash with existing content, so install can refuse before writing anything. */
const conflicts = async (db: Db, m: Manifest) => {
  const out: string[] = []
  for (const t of m.contentTypes) {
    const clash = await db
      .selectFrom("content_types")
      .select(["slug", "url_prefix"])
      .where((eb) =>
        eb.or([eb("slug", "=", t.slug), eb("url_prefix", "=", t.url_prefix)]),
      )
      .executeTakeFirst()
    if (clash)
      out.push(
        `A content type already uses ${clash.slug === t.slug ? `the name ${t.slug}` : `/${t.url_prefix}`}`,
      )
    if (
      await db
        .selectFrom("cms_pages")
        .select("id")
        .where("slug", "=", t.url_prefix)
        .executeTakeFirst()
    )
      out.push(`A page already uses /${t.url_prefix}`)
  }
  for (const t of m.emailTemplates) {
    if (
      await db
        .selectFrom("email_templates")
        .select("id")
        .where("slug", "=", t.slug)
        .executeTakeFirst()
    )
      out.push(`An email template ${t.slug} already exists`)
  }
  for (const r of m.redirects) {
    if (
      await db
        .selectFrom("redirects")
        .select("id")
        .where("from_path", "=", r.from)
        .executeTakeFirst()
    )
      out.push(`${r.from} already redirects`)
  }
  return out
}

export const installExtension = async (
  db: Db,
  m: Manifest,
  userId: string | null,
) => {
  if (
    await db
      .selectFrom("extensions")
      .select("id")
      .where("id", "=", m.id)
      .executeTakeFirst()
  )
    return { error: "This extension is already installed" }
  const clash = await conflicts(db, m)
  if (clash.length) return { error: clash.join(". ") }
  const typeIds = new Map<string, string>()
  for (const t of m.contentTypes) {
    const id = crypto.randomUUID()
    typeIds.set(t.slug, id)
    await db
      .insertInto("content_types")
      .values({
        id,
        slug: t.slug,
        name: t.name,
        singular: t.singular,
        url_prefix: t.url_prefix,
        description: t.description || null,
        fields_json: JSON.stringify(t.fields),
        has_archive: t.has_archive ? 1 : 0,
        in_search: t.in_search ? 1 : 0,
        extension_id: m.id,
      })
      .execute()
  }
  for (const e of m.entries) {
    const body = await bodyFrom(db, e.blocks)
    await db
      .insertInto("content_entries")
      .values({
        id: crypto.randomUUID(),
        type_id: typeIds.get(e.type)!,
        slug: e.slug,
        title: e.title,
        excerpt: e.excerpt || null,
        fields_json: JSON.stringify(
          cleanFieldValues(
            m.contentTypes.find((t) => t.slug === e.type)!.fields,
            e.fields,
          ),
        ),
        ...body,
        status: e.status,
        published_at: e.status === "published" ? nowIso() : null,
        created_by: userId,
      })
      .execute()
  }
  for (const b of m.blocks)
    await db
      .insertInto("cms_blocks")
      .values({
        id: crypto.randomUUID(),
        name: b.name,
        blocks_json: JSON.stringify(b.blocks),
        extension_id: m.id,
      })
      .execute()
  for (const t of m.emailTemplates) await saveTemplate(db, t, userId, m.id)
  for (const r of m.redirects)
    await db
      .insertInto("redirects")
      .values({
        from_path: r.from,
        to_url: r.to,
        status_code: r.code,
        extension_id: m.id,
      })
      .execute()
  if (m.settings.seo) {
    const s = await getSettings(db)
    await saveSetting(db, "seo", { ...s.seo, ...m.settings.seo }, userId)
  }
  invalidateRedirects()
  await db
    .insertInto("extensions")
    .values({
      id: m.id,
      name: m.name,
      version: m.version,
      manifest_json: JSON.stringify(m),
      installed_by: userId,
    })
    .execute()
  return { ok: true as const }
}

/** Removes what the extension added. With keepContent, its content types and entries stay as your own. */
export const uninstallExtension = async (
  db: Db,
  id: string,
  keepContent: boolean,
  userId: string | null,
) => {
  const row = await db
    .selectFrom("extensions")
    .select("manifest_json")
    .where("id", "=", id)
    .executeTakeFirst()
  if (!row) return { error: "Not installed" }
  const m = manifestSchema.parse(JSON.parse(row.manifest_json))
  if (keepContent) {
    await db
      .updateTable("content_types")
      .set({ extension_id: null })
      .where("extension_id", "=", id)
      .execute()
    await db
      .updateTable("cms_blocks")
      .set({ extension_id: null })
      .where("extension_id", "=", id)
      .execute()
    await db
      .updateTable("email_templates")
      .set({ extension_id: null })
      .where("extension_id", "=", id)
      .execute()
  } else {
    await db
      .deleteFrom("content_types")
      .where("extension_id", "=", id)
      .execute()
    await db.deleteFrom("cms_blocks").where("extension_id", "=", id).execute()
    await db
      .deleteFrom("email_templates")
      .where("extension_id", "=", id)
      .execute()
  }
  await db.deleteFrom("redirects").where("extension_id", "=", id).execute()
  if (m.settings.seo?.structuredData) {
    const s = await getSettings(db)
    await saveSetting(db, "seo", { ...s.seo, structuredData: false }, userId)
  }
  invalidateRedirects()
  await db.deleteFrom("extensions").where("id", "=", id).execute()
  return { ok: true as const }
}
