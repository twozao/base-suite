import { z } from "zod"
import type { Db } from "./db"
import { nowIso } from "./db/json"

// Email templates kept in the database (built-in overrides, your own, or from an extension) and the send log.

export type BuiltInTemplate = {
  slug: string
  name: string
  description: string
  variables: string[]
  /** Carries a sign-in or reset link: never sent by hand and never kept in the log body. */
  sensitive?: boolean
}

export const BUILT_IN_TEMPLATES: BuiltInTemplate[] = [
  {
    slug: "notice",
    name: "Notice",
    description:
      "General message used for contact replies, tickets and bookings.",
    variables: [
      "siteName",
      "color",
      "heading",
      "intro",
      "details",
      "actionLabel",
      "actionUrl",
    ],
  },
  {
    slug: "welcome_email",
    name: "Welcome",
    description: "Sent when someone finishes creating their profile.",
    variables: ["companyName", "WebsiteBaseUrl"],
  },
  {
    slug: "newsletter_confirm",
    name: "Newsletter confirmation",
    description: "Double opt-in link for new newsletter subscribers.",
    variables: ["siteName", "color", "name", "confirmUrl"],
  },
  {
    slug: "verify_email",
    name: "Verify email",
    description: "Email address check after sign-up.",
    variables: ["siteName", "color", "verifyUrl"],
    sensitive: true,
  },
  {
    slug: "reset_password",
    name: "Reset password",
    description: "Password reset link.",
    variables: ["siteName", "color", "resetUrl"],
    sensitive: true,
  },
]

export const isSensitiveTemplate = (slug: string | null | undefined) =>
  !!slug && BUILT_IN_TEMPLATES.some((t) => t.slug === slug && t.sensitive)

export const TEMPLATE_SLUG_RE = /^[a-z][a-z0-9_]{1,59}$/
const VAR_RE = /^[A-Za-z][A-Za-z0-9_]{0,39}$/

export const emailTemplateSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .regex(
        TEMPLATE_SLUG_RE,
        "Template id: lowercase letters, numbers and underscores",
      ),
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(500).default(""),
    subject: z.string().trim().min(1).max(300),
    html: z.string().max(100000).default(""),
    text: z.string().max(20000).default(""),
    variables: z.array(z.string().regex(VAR_RE)).max(30).default([]),
  })
  .refine((t) => t.html.trim() || t.text.trim(), {
    message: "Add an HTML or a plain text body",
    path: ["html"],
  })
export type EmailTemplateInput = z.output<typeof emailTemplateSchema>

/** The variable names a template uses, so the send form can ask for them. */
export const variablesIn = (...parts: string[]) => {
  const out = new Set<string>()
  for (const p of parts)
    for (const m of p.matchAll(/\{\{\{?\s*(?:#if\s+)?(\w+)\s*\}?\}\}/g))
      out.add(m[1])
  return [...out]
}

export const findTemplate = (db: Db, slug: string) =>
  db
    .selectFrom("email_templates")
    .selectAll()
    .where("slug", "=", slug)
    .executeTakeFirst()

export const saveTemplate = async (
  db: Db,
  t: EmailTemplateInput,
  userId: string | null,
  extensionId: string | null = null,
) => {
  const variables = t.variables.length
    ? t.variables
    : variablesIn(t.subject, t.html, t.text)
  const values = {
    name: t.name,
    description: t.description || null,
    subject: t.subject,
    html: t.html.trim() ? t.html : null,
    text: t.text.trim() ? t.text : null,
    variables_json: JSON.stringify(variables),
    updated_by: userId,
    updated_at: nowIso(),
  }
  const existing = await findTemplate(db, t.slug)
  if (existing) {
    await db
      .updateTable("email_templates")
      .set(values)
      .where("id", "=", existing.id)
      .execute()
    return existing.id
  }
  const id = crypto.randomUUID()
  await db
    .insertInto("email_templates")
    .values({ id, slug: t.slug, ...values, extension_id: extensionId })
    .execute()
  return id
}

const LOG_DAYS = 90

export type LogEntry = {
  template: string | null
  to: string[]
  subject: string
  status: "sent" | "failed" | "skipped"
  source?: "system" | "admin" | "test"
  providerId?: string | null
  error?: string | null
  bodyText?: string | null
  sentBy?: string | null
}

/** Records one send. Logging never stops an email, so failures here are only printed. */
export const logEmail = async (db: Db, e: LogEntry) => {
  try {
    await db
      .insertInto("email_log")
      .values({
        template: e.template,
        to_email: e.to.join(", ").slice(0, 1000),
        subject: e.subject.slice(0, 300),
        status: e.status,
        source: e.source ?? "system",
        provider_id: e.providerId ?? null,
        error: e.error?.slice(0, 500) ?? null,
        body_text: isSensitiveTemplate(e.template)
          ? null
          : (e.bodyText?.slice(0, 20000) ?? null),
        sent_by: e.sentBy ?? null,
      })
      .execute()
    const cutoff = new Date(Date.now() - LOG_DAYS * 86_400_000).toISOString()
    await db.deleteFrom("email_log").where("created_at", "<", cutoff).execute()
  } catch (err) {
    console.error(
      "email log write failed",
      err instanceof Error ? err.message : err,
    )
  }
}

/** Placeholder values for previews and test sends. */
export const sampleVars = (
  variables: string[],
  brand: { siteName: string; primaryColor: string },
  origin: string,
) =>
  Object.fromEntries(
    variables.map((v) => [
      v,
      v === "siteName" || v === "companyName"
        ? brand.siteName
        : v === "color"
          ? brand.primaryColor
          : /url$/i.test(v)
            ? `${origin}/`
            : `[${v}]`,
    ]),
  )
