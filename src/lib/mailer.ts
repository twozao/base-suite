import { Resend } from "resend"
import { env } from "$env/dynamic/private"
import type { SupabaseClient, User } from "@supabase/supabase-js"
import type { Database } from "../DatabaseDefinitions"
import handlebars from "handlebars"

/** Templates that exist as src/lib/emails/<name>_text.hbs and <name>_html.hbs. */
export type EmailTemplate = "welcome_email" | "newsletter_confirm"

// Sends an email to the admin email address.
// Does not throw errors, but logs them.
export const sendAdminEmail = async ({
  subject,
  body,
}: {
  subject: string
  body: string
}) => {
  // Check admin email is setup
  if (!env.PRIVATE_ADMIN_EMAIL) {
    return
  }

  try {
    const resend = new Resend(env.PRIVATE_RESEND_API_KEY)
    const resp = await resend.emails.send({
      from: env.PRIVATE_FROM_ADMIN_EMAIL || env.PRIVATE_ADMIN_EMAIL,
      to: [env.PRIVATE_ADMIN_EMAIL],
      subject: "ADMIN_MAIL: " + subject,
      text: body,
    })

    if (resp.error) {
      console.error("Failed to send admin email, error:", resp.error)
    }
  } catch (e) {
    console.error("Failed to send admin email, error:", e)
  }
}

// Sends a templated email to a user who has a verified address and has not unsubscribed.
// `db` is the request's service-role client (locals.supabaseServiceRole).
export const sendUserEmail = async ({
  db,
  user,
  subject,
  from_email,
  template_name,
  template_properties,
}: {
  db: SupabaseClient<Database>
  user: User
  subject: string
  from_email: string
  template_name: EmailTemplate
  template_properties: Record<string, string>
}) => {
  const email = user.email
  if (!email) {
    console.error("No email for user. Aborting email. ", user.id)
    return
  }

  // Oauth sets email_verified, email auth sets email_confirmed_at
  const { data: serviceUserData } = await db.auth.admin.getUserById(user.id)
  const emailVerified =
    serviceUserData.user?.email_confirmed_at ||
    serviceUserData.user?.user_metadata?.email_verified

  if (!emailVerified) {
    console.error("User email not verified. Aborting email. ", user.id, email)
    return
  }

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("unsubscribed")
    .eq("id", user.id)
    .single()

  if (profileError) {
    console.error(
      "Error fetching user profile. Aborting email. ",
      user.id,
      email,
    )
    return
  }

  if (profile?.unsubscribed) {
    console.error("User unsubscribed. Aborting email. ", user.id, email)
    return
  }

  await sendTemplatedEmail({
    subject,
    to_emails: [email],
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
  if (!env.PRIVATE_RESEND_API_KEY) {
    // email not configured.  Emails are optional so no error is thrown
    return
  }

  let plaintextBody: string | undefined = undefined
  try {
    const textTemplate = await import(
      `./emails/${template_name}_text.hbs?raw`
    ).then((mod) => mod.default)
    const template = handlebars.compile(textTemplate)
    plaintextBody = template(template_properties)
  } catch {
    // ignore, plaintextBody is optional
    plaintextBody = undefined
  }

  let htmlBody: string | undefined = undefined
  try {
    const htmlTemplate = await import(
      `./emails/${template_name}_html.hbs?raw`
    ).then((mod) => mod.default)
    const template = handlebars.compile(htmlTemplate)
    htmlBody = template(template_properties)
  } catch {
    // ignore, htmlBody is optional
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
    if (resp.error) {
      console.error("Failed to send email, error:", resp.error)
    }
  } catch (e) {
    console.error("Failed to send email, error:", e)
  }
}
