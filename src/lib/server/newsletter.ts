import { z } from "zod"
import { env } from "$env/dynamic/private"
import type { RequestEvent } from "@sveltejs/kit"
import { nowIso } from "./db/json"
import { randomToken, sha256Hex } from "./security/crypto"
import { sendTemplatedEmail } from "$lib/mailer"
import { getSettings } from "./settings"
import { captureLead } from "./crm"

export const subscribeSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(320)
    .email("Please enter a valid email"),
  name: z.string().trim().max(200).optional(),
  source: z.string().trim().max(100).optional(),
})

const emailConfigured = () =>
  !!env.PRIVATE_RESEND_API_KEY &&
  !!(env.PRIVATE_FROM_EMAIL || env.PRIVATE_FROM_ADMIN_EMAIL)

/**
 * Double opt-in subscribe. Always answers the same way whatever the current state, so the form
 * can't be used to discover who is subscribed. Without an email provider configured, signups are
 * confirmed immediately (single opt-in); set up Resend to get double opt-in.
 */
export const subscribe = async (
  event: RequestEvent,
  input: z.output<typeof subscribeSchema>,
): Promise<{ confirmed: boolean }> => {
  const db = event.locals.db
  const existing = await db
    .selectFrom("newsletter_subscribers")
    .select(["id", "status"])
    .where("email", "=", input.email)
    .executeTakeFirst()
  if (existing?.status === "confirmed") return { confirmed: !emailConfigured() }

  const confirmToken = randomToken()
  const unsubscribeToken = randomToken()
  const doubleOptIn = emailConfigured()
  const row = {
    email: input.email,
    name: input.name || null,
    source: input.source || null,
    status: doubleOptIn ? ("pending" as const) : ("confirmed" as const),
    confirm_token_hash: doubleOptIn ? await sha256Hex(confirmToken) : null,
    unsubscribe_token_hash: await sha256Hex(unsubscribeToken),
    confirmed_at: doubleOptIn ? null : nowIso(),
    unsubscribed_at: null,
  }
  if (existing) {
    await db
      .updateTable("newsletter_subscribers")
      .set(row)
      .where("id", "=", existing.id)
      .execute()
  } else {
    await db
      .insertInto("newsletter_subscribers")
      .values({ id: crypto.randomUUID(), ...row })
      .execute()
  }

  if (doubleOptIn) {
    const s = await getSettings(db)
    await sendTemplatedEmail({
      subject: `Confirm your subscription to ${s.brand.siteName}`,
      to_emails: [input.email],
      from_email: env.PRIVATE_FROM_EMAIL || env.PRIVATE_FROM_ADMIN_EMAIL || "",
      template_name: "newsletter_confirm",
      template_properties: {
        name: input.name ?? "",
        siteName: s.brand.siteName,
        color: s.brand.primaryColor,
        confirmUrl: `${event.url.origin}/newsletter/confirm?token=${encodeURIComponent(confirmToken)}`,
      },
    })
  } else {
    await captureLead(db, {
      email: input.email,
      name: input.name,
      source: "newsletter",
      kind: "newsletter",
      body: "Subscribed to the newsletter",
    })
  }
  return { confirmed: !doubleOptIn }
}

export const confirm = async (event: RequestEvent, token: string) => {
  if (!token || token.length > 100) return false
  const db = event.locals.db
  const data = await db
    .updateTable("newsletter_subscribers")
    .set({
      status: "confirmed",
      confirmed_at: nowIso(),
      confirm_token_hash: null,
    })
    .where("confirm_token_hash", "=", await sha256Hex(token))
    .where("status", "=", "pending")
    .returning(["email", "name"])
    .executeTakeFirst()
  if (!data) return false
  await captureLead(db, {
    email: data.email,
    name: data.name,
    source: "newsletter",
    kind: "newsletter",
    body: "Confirmed newsletter subscription",
  })
  return true
}

export const unsubscribe = async (event: RequestEvent, token: string) => {
  if (!token || token.length > 100) return false
  const data = await event.locals.db
    .updateTable("newsletter_subscribers")
    .set({ status: "unsubscribed", unsubscribed_at: nowIso() })
    .where("unsubscribe_token_hash", "=", await sha256Hex(token))
    .returning("id")
    .executeTakeFirst()
  return !!data
}
