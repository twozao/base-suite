import { Resend } from "resend"
import { env } from "$env/dynamic/private"
import handlebars from "handlebars"
import type { Db } from "$lib/server/db"

/** Templates that exist as src/lib/emails/<name>_text.hbs and <name>_html.hbs. */
export type EmailTemplate =
  | "welcome_email"
  | "newsletter_confirm"
  | "verify_email"
  | "reset_password"

// Sends an email to the admin email address. Does not throw errors, but logs them.
export const sendAdminEmail = async ({
  subject,
  body,
}: {
  subject: string
  body: string
}) => {
  if (!env.PRIVATE_ADMIN_EMAIL) return
  try {
    const resend = new Resend(env.PRIVATE_RESEND_API_KEY)
    const resp = await resend.emails.send({
      from: env.PRIVATE_FROM_ADMIN_EMAIL || env.PRIVATE_ADMIN_EMAIL,
      to: [env.PRIVATE_ADMIN_EMAIL],
      subject: "ADMIN_MAIL: " + subject,
      text: body,
    })
    if (resp.error)
      console.error("Failed to send admin email, error:", resp.error)
  } catch (e) {
    console.error("Failed to send admin email, error:", e)
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
    subject,
    to_emails: [row.email],
    from_email,
    template_name,
    template_properties,
  })
}

export const sendTemplatedEmail = async ({
  subject,
  to_emails,
  from_email,
  template_name,
  template_properties,
}: {
  subject: string
  to_emails: string[]
  from_email: string
  template_name: EmailTemplate
  template_properties: Record<string, string>
}) => {
  // Email is optional: without a provider nothing is sent and no error is raised.
  if (!env.PRIVATE_RESEND_API_KEY) return

  let plaintextBody: string | undefined = undefined
  try {
    const textTemplate = await import(
      `./emails/${template_name}_text.hbs?raw`
    ).then((mod) => mod.default)
    plaintextBody = handlebars.compile(textTemplate)(template_properties)
  } catch {
    plaintextBody = undefined
  }

  let htmlBody: string | undefined = undefined
  try {
    const htmlTemplate = await import(
      `./emails/${template_name}_html.hbs?raw`
    ).then((mod) => mod.default)
    htmlBody = handlebars.compile(htmlTemplate)(template_properties)
  } catch {
    htmlBody = undefined
  }

  if (!plaintextBody && !htmlBody) {
    console.error("No email body for template", template_name)
    return
  }

  try {
    const content = htmlBody
      ? { html: htmlBody, text: plaintextBody }
      : { text: plaintextBody as string }
    const resend = new Resend(env.PRIVATE_RESEND_API_KEY)
    const resp = await resend.emails.send({
      from: from_email,
      to: to_emails,
      subject,
      ...content,
    })
    if (resp.error) console.error("Failed to send email, error:", resp.error)
  } catch (e) {
    console.error("Failed to send email, error:", e)
  }
}
