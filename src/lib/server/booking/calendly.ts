import { z } from "zod"
import { hmacSha256Hex, timingSafeEqual } from "../security/crypto"

// Calendly signs webhooks with:  Calendly-Webhook-Signature: t=<unix>,v1=<hex>
// where v1 = HMAC-SHA256(signingKey, `${t}.${rawBody}`).
// https://developer.calendly.com/api-docs/4c305798a61d3-webhook-signatures

export const SIGNATURE_TOLERANCE_SECONDS = 180

export const verifyCalendlySignature = async ({
  header,
  body,
  signingKey,
  now = Date.now(),
}: {
  header: string | null
  body: string
  signingKey: string
  now?: number
}): Promise<boolean> => {
  if (!header || !signingKey) return false
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const i = p.indexOf("=")
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()]
    }),
  )
  const t = parts["t"]
  const v1 = parts["v1"]
  if (!t || !v1 || !/^\d+$/.test(t)) return false
  if (Math.abs(now / 1000 - Number(t)) > SIGNATURE_TOLERANCE_SECONDS) {
    return false // replay protection
  }
  const expected = await hmacSha256Hex(signingKey, `${t}.${body}`)
  return timingSafeEqual(expected, v1.toLowerCase())
}

const str = (max: number) => z.string().max(max)

export const calendlyWebhookSchema = z.object({
  event: z.enum(["invitee.created", "invitee.canceled"]),
  payload: z.object({
    uri: str(500),
    email: str(320).nullish(),
    name: str(300).nullish(),
    cancel_url: str(1000).nullish(),
    reschedule_url: str(1000).nullish(),
    cancellation: z.object({ reason: str(2000).nullish() }).nullish(),
    scheduled_event: z
      .object({
        uri: str(500).nullish(),
        name: str(300).nullish(),
        start_time: str(64).nullish(),
        end_time: str(64).nullish(),
      })
      .nullish(),
  }),
})

export type CalendlyWebhook = z.output<typeof calendlyWebhookSchema>

/** Map a verified webhook to a bookings row (minus user_id). */
export const bookingFromWebhook = (hook: CalendlyWebhook) => {
  const p = hook.payload
  const ev = p.scheduled_event
  return {
    provider: "calendly" as const,
    external_id: p.uri,
    event_uri: ev?.uri ?? null,
    event_name: ev?.name ?? null,
    invitee_name: p.name ?? null,
    invitee_email: p.email?.toLowerCase() ?? null,
    start_time: ev?.start_time ?? null,
    end_time: ev?.end_time ?? null,
    status:
      hook.event === "invitee.canceled"
        ? ("canceled" as const)
        : ("scheduled" as const),
    cancel_reason: p.cancellation?.reason ?? null,
    cancel_url: p.cancel_url ?? null,
    reschedule_url: p.reschedule_url ?? null,
    updated_at: new Date().toISOString(),
  }
}

/**
 * Calendly inline embed URL. We embed the scheduling page as a plain iframe
 * rather than loading Calendly's widget script: no third-party JS on our
 * origin, and nothing loads until the visitor picks an event type.
 */
export const calendlyEmbedUrl = (
  url: string,
  opts: { name?: string | null; email?: string | null; host: string },
) => {
  const u = new URL(url)
  u.searchParams.set("embed_domain", opts.host)
  u.searchParams.set("embed_type", "Inline")
  u.searchParams.set("hide_gdpr_banner", "1")
  if (opts.name) u.searchParams.set("name", opts.name)
  if (opts.email) u.searchParams.set("email", opts.email)
  return u.toString()
}
