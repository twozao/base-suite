import { z } from "zod"
import type { Db } from "../db"
import { RESERVED_SLUGS, SLUG_RE } from "./pages"

// Content types the owner defines in the admin (case studies, team, locations...), each with its own
// fields and URL prefix. Field values are validated against the definition on every save.

export const FIELD_TYPES = [
  "text",
  "textarea",
  "markdown",
  "number",
  "date",
  "image",
  "link",
  "select",
  "boolean",
  "relation",
] as const
export type FieldType = (typeof FIELD_TYPES)[number]

export const FIELD_LABELS: Record<FieldType, string> = {
  text: "Short text",
  textarea: "Long text",
  markdown: "Formatted text",
  number: "Number",
  date: "Date",
  image: "Image",
  link: "Link",
  select: "Choice",
  boolean: "Yes or no",
  relation: "Link to another entry",
}

export const fieldDefSchema = z.object({
  key: z
    .string()
    .trim()
    .regex(
      /^[a-z][a-z0-9_]{0,39}$/,
      "Field keys: lowercase letters, numbers and _",
    ),
  label: z.string().trim().min(1, "Label is required").max(80),
  type: z.enum(FIELD_TYPES),
  required: z.boolean().default(false),
  help: z.string().trim().max(200).default(""),
  options: z.array(z.string().trim().min(1).max(80)).max(50).default([]),
  /** For relation fields: the content type slug the value points at */
  relation: z.string().trim().max(60).default(""),
  /** Shown on archive cards */
  showInList: z.boolean().default(false),
})
export type FieldDef = z.output<typeof fieldDefSchema>

export const fieldListSchema = z
  .array(fieldDefSchema)
  .max(40)
  .superRefine((fields, ctx) => {
    const seen = new Set<string>()
    fields.forEach((f, i) => {
      if (seen.has(f.key))
        ctx.addIssue({
          code: "custom",
          path: [i, "key"],
          message: `Field key "${f.key}" is used twice`,
        })
      seen.add(f.key)
      if (f.type === "select" && !f.options.length)
        ctx.addIssue({
          code: "custom",
          path: [i, "options"],
          message: `"${f.label}" needs at least one choice`,
        })
      if (f.type === "relation" && !f.relation)
        ctx.addIssue({
          code: "custom",
          path: [i, "relation"],
          message: `"${f.label}" needs a content type to link to`,
        })
    })
  })

export const typeInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  singular: z.string().trim().min(1, "Singular name is required").max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z][a-z0-9_-]{0,59}$/,
      "Use lowercase letters, numbers, - and _",
    ),
  url_prefix: z
    .string()
    .trim()
    .toLowerCase()
    .max(60)
    .regex(SLUG_RE, "Use lowercase letters, numbers and dashes")
    .refine((s) => !RESERVED_SLUGS.has(s), "This URL is reserved"),
  description: z
    .string()
    .trim()
    .max(500)
    .transform((v) => v || null),
  has_archive: z.boolean(),
  in_search: z.boolean(),
  fields: fieldListSchema,
})
export type TypeInput = z.output<typeof typeInputSchema>

export type ContentType = {
  id: string
  slug: string
  name: string
  singular: string
  url_prefix: string
  description: string | null
  fields: FieldDef[]
  has_archive: boolean
  in_search: boolean
  extension_id: string | null
}

const parseFields = (json: string): FieldDef[] => {
  try {
    const r = fieldListSchema.safeParse(JSON.parse(json))
    return r.success ? r.data : []
  } catch {
    return []
  }
}

const COLUMNS = [
  "id",
  "slug",
  "name",
  "singular",
  "url_prefix",
  "description",
  "fields_json",
  "has_archive",
  "in_search",
  "extension_id",
] as const

const toType = (r: {
  id: string
  slug: string
  name: string
  singular: string
  url_prefix: string
  description: string | null
  fields_json: string
  has_archive: number
  in_search: number
  extension_id: string | null
}): ContentType => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  singular: r.singular,
  url_prefix: r.url_prefix,
  description: r.description,
  fields: parseFields(r.fields_json),
  has_archive: !!r.has_archive,
  in_search: !!r.in_search,
  extension_id: r.extension_id,
})

export const listTypes = async (db: Db) =>
  (
    await db
      .selectFrom("content_types")
      .select(COLUMNS)
      .orderBy("name")
      .execute()
  ).map(toType)

export const typeBy = async (
  db: Db,
  col: "id" | "slug" | "url_prefix",
  value: string,
) => {
  const r = await db
    .selectFrom("content_types")
    .select(COLUMNS)
    .where(col, "=", value)
    .executeTakeFirst()
  return r ? toType(r) : null
}

/** A URL prefix must not clash with a page, which lives at the same level. */
export const prefixProblem = async (
  db: Db,
  prefix: string,
  typeId: string | null,
) => {
  const page = await db
    .selectFrom("cms_pages")
    .select("id")
    .where("slug", "=", prefix)
    .executeTakeFirst()
  if (page) return "A page already uses this URL"
  const other = await db
    .selectFrom("content_types")
    .select("id")
    .where("url_prefix", "=", prefix)
    .$if(!!typeId, (q) => q.where("id", "!=", typeId!))
    .executeTakeFirst()
  return other ? "Another content type already uses this URL" : null
}

export type FieldValues = Record<string, string | number | boolean | null>

const isoDate = /^\d{4}-\d{2}-\d{2}$/
const linkRe =
  /^(\/(?![/\\])[^\s\\]*|https?:\/\/[^\s]+|mailto:[^\s]+|tel:[+\d\s()-]+)$/i
const imageRe = /^(\/(?![/\\])[^\s\\]*|https:\/\/[^\s]+)$/i

/** Reads field values from the entry form (inputs named field_<key>) and checks them against the type. */
export const readFieldValues = (
  fields: FieldDef[],
  form: FormData,
): {
  values: FieldValues
  errors: Record<string, string>
  raw: Record<string, string>
} => {
  const values: FieldValues = {}
  const errors: Record<string, string> = {}
  const raw: Record<string, string> = {}
  for (const f of fields) {
    const name = `field_${f.key}`
    const v = String(form.get(name) ?? "").trim()
    raw[f.key] = f.type === "boolean" ? (form.get(name) ? "1" : "") : v
    const fail = (m: string) => (errors[name] = m)
    if (f.type === "boolean") {
      values[f.key] = form.get(name) === "on" || form.get(name) === "1"
      continue
    }
    if (!v) {
      if (f.required) fail(`${f.label} is required`)
      values[f.key] = null
      continue
    }
    switch (f.type) {
      case "text":
        if (v.length > 300) fail(`${f.label}: 300 characters at most`)
        values[f.key] = v
        break
      case "textarea":
      case "markdown":
        if (v.length > 20_000) fail(`${f.label} is too long`)
        values[f.key] = v
        break
      case "number": {
        const n = Number(v)
        if (!Number.isFinite(n)) fail(`${f.label} must be a number`)
        values[f.key] = n
        break
      }
      case "date":
        if (!isoDate.test(v) || Number.isNaN(Date.parse(v)))
          fail(`${f.label} must be a date`)
        values[f.key] = v
        break
      case "image":
        if (!imageRe.test(v) || v.length > 1000)
          fail(`${f.label}: use an image from Media or an https:// address`)
        values[f.key] = v
        break
      case "link":
        if (!linkRe.test(v) || v.length > 1000)
          fail(`${f.label}: use a path like /contact or a full https:// link`)
        values[f.key] = v
        break
      case "select":
        if (!f.options.includes(v)) fail(`${f.label}: pick one of the choices`)
        values[f.key] = v
        break
      case "relation":
        if (!/^[0-9a-f-]{36}$/.test(v)) fail(`${f.label}: pick an entry`)
        values[f.key] = v
        break
    }
  }
  return { values, errors, raw }
}

export const parseFieldValues = (json: string): FieldValues => {
  try {
    const v = JSON.parse(json)
    return v && typeof v === "object" && !Array.isArray(v)
      ? (v as FieldValues)
      : {}
  } catch {
    return {}
  }
}

/** Entry URL. */
export const entryPath = (type: { url_prefix: string }, slug: string) =>
  `/${type.url_prefix}/${slug}`

/** Stored values with anything invalid for the type dropped: for data from packages and backups. */
export const cleanFieldValues = (
  fields: FieldDef[],
  values: FieldValues,
): FieldValues => {
  const fd = new FormData()
  for (const [k, v] of Object.entries(values)) {
    if (v === true) fd.set(`field_${k}`, "on")
    else if (v !== null && v !== false && v !== undefined)
      fd.set(`field_${k}`, String(v))
  }
  const r = readFieldValues(fields, fd)
  const out: FieldValues = {}
  for (const f of fields)
    if (!r.errors[`field_${f.key}`]) out[f.key] = r.values[f.key] ?? null
  return out
}
