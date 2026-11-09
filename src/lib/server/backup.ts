import { z } from "zod"
import { blocksOrMarkdown } from "$lib/blocks"
import { bodyFrom } from "./cms/content"
import { renderMarkdown } from "./cms/markdown"
import { cleanFieldValues, listTypes, parseFieldValues } from "./cms/types"
import type { Db } from "./db"
import { invalidateRedirects } from "./redirects"
import { invalidateSettings, settingsSchema } from "./settings"

// A download of the site's content and settings as one JSON file, and restoring it. Accounts, passwords,
// sessions, stored secrets and visitor messages are never in it. Media files stay in storage; their list is.

export const CONTENT_TABLES = [
  "cms_pages",
  "posts",
  "content_types",
  "content_entries",
  "cms_blocks",
  "redirects",
  "content_translations",
  "site_translations",
  "forms",
  "media",
  "extensions",
  "email_templates",
] as const
type Table = (typeof CONTENT_TABLES)[number]

const KEYS: Record<Table, string[]> = {
  cms_pages: ["id"],
  posts: ["id"],
  content_types: ["id"],
  content_entries: ["id"],
  cms_blocks: ["id"],
  redirects: ["from_path"],
  content_translations: ["kind", "content_id", "locale"],
  site_translations: ["locale", "area"],
  forms: ["id"],
  media: ["name"],
  extensions: ["id"],
  email_templates: ["id"],
}
// Columns that point at users; restored as empty so a backup works on a site with other accounts.
const USER_COLUMNS = ["created_by", "updated_by", "installed_by"]

export const exportSite = async (db: Db) => {
  const tables: Record<string, unknown[]> = {}
  for (const t of CONTENT_TABLES)
    tables[t] = await db.selectFrom(t).selectAll().execute()
  const settings = (
    await db.selectFrom("site_settings").select(["key", "value"]).execute()
  ).filter((r) => r.key in settingsSchema)
  return {
    format: "base-suite-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    tables,
  }
}

const backupSchema = z.object({
  format: z.literal("base-suite-backup"),
  version: z.literal(1),
  settings: z
    .array(z.object({ key: z.string(), value: z.string() }))
    .default([]),
  tables: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
})

/** Restores content and settings. Rows with the same key are replaced; nothing else is deleted. */
export const restoreSite = async (db: Db, text: string) => {
  let parsed
  try {
    parsed = backupSchema.safeParse(JSON.parse(text))
  } catch {
    return { error: "The file is not valid JSON" }
  }
  if (!parsed.success) return { error: "This is not a Base Suite backup" }
  const counts: Record<string, number> = {}
  // Types before their entries, so the foreign key holds.
  for (const t of CONTENT_TABLES) {
    const rows = parsed.data.tables[t] ?? []
    let n = 0
    for (const raw of rows) {
      const row: Record<string, unknown> = { ...raw }
      for (const c of USER_COLUMNS) if (c in row) row[c] = null
      if (t === "redirects") delete row.id
      const keys = KEYS[t]
      const update = Object.fromEntries(
        Object.entries(row).filter(([k]) => !keys.includes(k)),
      )
      try {
        await db
          .insertInto(t)
          .values(row as never)
          .onConflict((oc) =>
            Object.keys(update).length
              ? oc.columns(keys as never).doUpdateSet(update as never)
              : oc.columns(keys as never).doNothing(),
          )
          .execute()
        n++
      } catch (e) {
        console.error(
          `restore ${t} row failed`,
          e instanceof Error ? e.message : e,
        )
      }
    }
    counts[t] = n
  }
  for (const s of parsed.data.settings) {
    if (!(s.key in settingsSchema)) continue
    await db
      .insertInto("site_settings")
      .values({ key: s.key, value: s.value, updated_by: null })
      .onConflict((oc) => oc.column("key").doUpdateSet({ value: s.value }))
      .execute()
  }
  // Stored HTML from a file is never trusted: every body is rendered again from its blocks or Markdown.
  for (const t of ["cms_pages", "posts", "content_entries"] as const) {
    const rows = await db
      .selectFrom(t)
      .select(["id", "blocks_json", "body_md"])
      .execute()
    for (const r of rows) {
      const body = await bodyFrom(
        db,
        blocksOrMarkdown(r.blocks_json, r.body_md),
      )
      await db
        .updateTable(t)
        .set({ body_html: body.body_html })
        .where("id", "=", r.id)
        .execute()
    }
  }
  // Entry fields are checked against their type again, so a crafted value (a javascript: link) is dropped.
  for (const type of await listTypes(db)) {
    const rows = await db
      .selectFrom("content_entries")
      .select(["id", "fields_json"])
      .where("type_id", "=", type.id)
      .execute()
    for (const r of rows)
      await db
        .updateTable("content_entries")
        .set({
          fields_json: JSON.stringify(
            cleanFieldValues(type.fields, parseFieldValues(r.fields_json)),
          ),
        })
        .where("id", "=", r.id)
        .execute()
  }
  const translations = await db
    .selectFrom("content_translations")
    .select(["kind", "content_id", "locale", "body_md"])
    .execute()
  for (const r of translations)
    await db
      .updateTable("content_translations")
      .set({ body_html: renderMarkdown(r.body_md) })
      .where("kind", "=", r.kind)
      .where("content_id", "=", r.content_id)
      .where("locale", "=", r.locale)
      .execute()
  invalidateSettings()
  invalidateRedirects()
  return { ok: true as const, counts }
}
