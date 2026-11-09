import { Resend } from "resend"
import { env } from "$env/dynamic/private"
import type { Db } from "$lib/server/db"
import { findTemplate, logEmail } from "$lib/server/email"

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "`": "&#x60;",
  "=": "&#x3D;",
}
const escape = (s: string) => s.replace(/[&<>"'`=]/g, (c) => ESCAPES[c])

/**
 * The part of Handlebars the email templates use: {{{raw}}}, {{escaped}} and {{#if x}}...{{/if}}.
 * mode "html-safe" escapes {{{raw}}} too (templates edited in the admin); "text" escapes nothing.
 */
export const renderTemplate = (
  tpl: string,
  vars: Record<string, string>,
  mode: "files" | "html-safe" | "text" = "files",
) =>
  tpl
    .replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, key, body) =>
      vars[key] ? body : "",
    )
    .replace(/\{\{\{\s*(\w+)\s*\}\}\}/g, (_, key) =>
      mode === "html-safe" ? escape(vars[key] ?? "") : (vars[key] ?? ""),
    )
    .replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) =>
      mode === "text" ? (vars[key] ?? "") : escape(vars[key] ?? ""),
    )

/** Built-in templates, from src/lib/emails/<name>_text.hbs and <name>_html.hbs. */
export type EmailTemplate =
  | "welcome_email"
  | "newsletter_confirm"
  | "verify_email"
  | "reset_password"
  | "notice"

const FILES = import.meta.glob("./emails/*.hbs", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>

export const fileTemplate = (name: string) => ({
  html: FILES[`./emails/${name}_html.hbs`],
  text: FILES[`./emails/${name}_text.hbs`],
})

type Source = "system" | "admin" | "test"
export type SendResult = {
  status: "sent" | "failed" | "skipped"
  error?: string
}

/** Builds the subject and bodies: a template saved in the admin wins over the built-in file of the same name.
 * The caller's subject is available to templates as {{subject}}. */
export const renderEmail = async (
  db: Db,
  name: string,
  subject: string,
  vars: Record<string, string>,
) => {
  const saved = await findTemplate(db, name)
  vars = { subject, ...vars }
  if (saved)
    return {
      subject:
        renderTemplate(saved.subject, vars, "text").replace(/[\r\n]+/g, " ") ||
        subject,
      html: saved.html
        ? renderTemplate(saved.html, vars, "html-safe")
        : undefined,
      text: saved.text ? renderTemplate(saved.text, vars, "text") : undefined,
    }
  const f = fileTemplate(name)
  return {
    subject,
    html: f.html ? renderTemplate(f.html, vars) : undefined,
    text: f.text ? renderTemplate(f.text, vars) : undefined,
  }
}

// Sends an email to the admin email address. Does not throw errors, but logs them.
export const sendAdminEmail = async ({
  db,
  subject,
  body,
}: {
  db: Db
  subject: string
  body: string
}) => {
  if (!env.PRIVATE_ADMIN_EMAIL) return
  const to = [env.PRIVATE_ADMIN_EMAIL]
  const log = (r: SendResult, providerId?: string) =>
    logEmail(db, {
      template: null,
      to,
      subject,
      status: r.status,
      error: r.error,
      providerId,
      bodyText: body,
    })
  if (!env.PRIVATE_RESEND_API_KEY)
    return log({ status: "skipped", error: "No email provider key is set" })
  try {
    const resend = new Resend(env.PRIVATE_RESEND_API_KEY)
    const resp = await resend.emails.send({
      from: env.PRIVATE_FROM_ADMIN_EMAIL || env.PRIVATE_ADMIN_EMAIL,
      to,
      subject: "ADMIN_MAIL: " + subject,
      text: body,
    })
    if (resp.error) {
      console.error("Failed to send admin email, error:", resp.error)
      return log({ status: "failed", error: resp.error.message })
    }
    return log({ status: "sent" }, resp.data?.id)
  } catch (e) {
    console.error("Failed to send admin email, error:", e)
    return log({
      status: "failed",
      error: e instanceof Error ? e.message : "Send failed",
    })
  }
}

/** Sends a templated email to a user who has a verified address and has not unsubscribed. */
export const sendUserEmail = async ({
  db,
  userId,
  subject,
  from_email,
  template_name,
  template_properties,
}: {
  db: Db
  userId: string
  subject: string
  from_email: string
  template_name: EmailTemplate
  template_properties: Record<string, string>
}) => {
  const row = await db
    .selectFrom("users")
    .leftJoin("profiles", "profiles.id", "users.id")
    .select(["users.email", "users.email_verified", "profiles.unsubscribed"])
    .where("users.id", "=", userId)
    .executeTakeFirst()
  if (!row) {
    console.error("No such user. Aborting email.", userId)
    return
  }
  if (row.email_verified !== 1) {
    console.error("User email not verified. Aborting email.", userId)
    return
  }
  if (row.unsubscribed === 1) {
    console.error("User unsubscribed. Aborting email.", userId)
    return
  }
  await sendTemplatedEmail({
    db,
    subject,
    to_emails: [row.email],
    from_email,
    template_name,
    template_properties,
  })
}

export const sendTemplatedEmail = async ({
  db,
  subject,
  to_emails,
  from_email,
  template_name,
  template_properties,
  attachments,
  source = "system",
  sent_by = null,
}: {
  db: Db
  subject: string
  to_emails: string[]
  from_email: string
  template_name: EmailTemplate | (string & {})
  template_properties: Record<string, string>
  attachments?: { filename: string; content: Buffer; contentType: string }[]
  source?: Source
  sent_by?: string | null
}): Promise<SendResult> => {
  const mail = await renderEmail(
    db,
    template_name,
    subject,
    template_properties,
  )
  const log = async (r: SendResult, providerId?: string) => {
    await logEmail(db, {
      template: template_name,
      to: to_emails,
      subject: mail.subject,
      status: r.status,
      source,
      error: r.error,
      providerId,
      bodyText: mail.text ?? mail.html?.replace(/<[^>]*>/g, " "),
      sentBy: sent_by,
    })
    return r
  }

  // Email is optional: without a provider nothing is sent and no error is raised.
  if (!env.PRIVATE_RESEND_API_KEY)
    return log({ status: "skipped", error: "No email provider key is set" })
  if (!from_email)
    return log({ status: "skipped", error: "No sender address is set" })
  if (!mail.text && !mail.html) {
    console.error("No email body for template", template_name)
    return log({ status: "failed", error: "The template has no body" })
  }

  try {
    const content = mail.html
      ? { html: mail.html, text: mail.text }
      : { text: mail.text as string }
    const resend = new Resend(env.PRIVATE_RESEND_API_KEY)
    const resp = await resend.emails.send({
      from: from_email,
      to: to_emails,
      subject: mail.subject,
      ...content,
      ...(attachments ? { attachments } : {}),
    })
    if (resp.error) {
      console.error("Failed to send email, error:", resp.error)
      return log({ status: "failed", error: resp.error.message })
    }
    return log({ status: "sent" }, resp.data?.id)
  } catch (e) {
    console.error("Failed to send email, error:", e)
    return log({
      status: "failed",
      error: e instanceof Error ? e.message : "Send failed",
    })
  }
}
