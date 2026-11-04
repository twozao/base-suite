import type { RequestEvent } from "@sveltejs/kit"
import { env } from "$env/dynamic/private"
import { sendTemplatedEmail } from "$lib/mailer"
import { getSettings } from "../settings"
import { createSession, setSessionCookie } from "./session"
import { issueToken } from "./users"

type Ev = Pick<RequestEvent, "locals" | "cookies" | "url">

/** Opens a session for the user and sets the cookie on this response. */
export const startSession = async (event: Ev, userId: string) => {
  const { token, expiresAt } = await createSession(event.locals.db, userId)
  setSessionCookie(
    event.cookies,
    token,
    expiresAt,
    event.url.protocol === "https:",
  )
}

// Transactional mail needs a provider key and a sender. Without them, sign-up skips verification.
export const mailConfigured = () =>
  !!env.PRIVATE_RESEND_API_KEY &&
  !!(env.PRIVATE_FROM_EMAIL || env.PRIVATE_FROM_ADMIN_EMAIL)

const fromEmail = () =>
  env.PRIVATE_FROM_EMAIL || env.PRIVATE_FROM_ADMIN_EMAIL || ""

export const sendVerificationEmail = async (
  event: Ev,
  userId: string,
  email: string,
) => {
  if (!mailConfigured()) return false
  const token = await issueToken(event.locals.db, userId, "verify_email")
  const { brand } = await getSettings(event.locals.db)
  await sendTemplatedEmail({
    subject: `Verify your email for ${brand.siteName}`,
    to_emails: [email],
    from_email: fromEmail(),
    template_name: "verify_email",
    template_properties: {
      siteName: brand.siteName,
      color: brand.primaryColor,
      verifyUrl: `${event.url.origin}/auth/verify?token=${encodeURIComponent(token)}`,
    },
  })
  return true
}

export const sendPasswordResetEmail = async (
  event: Ev,
  userId: string,
  email: string,
) => {
  if (!mailConfigured()) return false
  const token = await issueToken(event.locals.db, userId, "reset_password")
  const { brand } = await getSettings(event.locals.db)
  await sendTemplatedEmail({
    subject: `Reset your ${brand.siteName} password`,
    to_emails: [email],
    from_email: fromEmail(),
    template_name: "reset_password",
    template_properties: {
      siteName: brand.siteName,
      color: brand.primaryColor,
      resetUrl: `${event.url.origin}/login/reset_password?token=${encodeURIComponent(token)}`,
    },
  })
  return true
}
