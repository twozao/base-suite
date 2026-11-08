import { z } from "zod"
import type { Settings } from "./settings"
import type { Visitor, VisitorDetails } from "./store/store"

// Everything here comes from the visitor or their request, so it is capped and stripped before it is stored,
// and reaches the model only as labelled data.
const clean = (s: string | null | undefined, max: number) => {
  const t = (s ?? "")
    .replace(/[\p{Cc}<>]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
  return t || null
}

export const visitorBody = z.object({
  name: z.string().max(200).optional(),
  email: z.string().max(320).optional(),
  phone: z.string().max(60).optional(),
  location: z.string().max(200).optional(),
  timezone: z.string().max(80).optional(),
  language: z.string().max(40).optional(),
  page: z.string().max(2000).optional(),
})

/** Checks the form against what the admin asks for. Returns one message per field. */
export const parseVisitorForm = (
  form: Settings["visitorForm"],
  b: z.output<typeof visitorBody>,
):
  | { ok: true; details: VisitorDetails }
  | { ok: false; errors: Record<string, string> } => {
  const errors: Record<string, string> = {}
  const name = form.name === "off" ? null : clean(b.name, 100)
  const email = form.email === "off" ? null : clean(b.email, 320)?.toLowerCase()
  const phone = form.phone === "off" ? null : clean(b.phone, 40)
  const typedLocation = form.location === "off" ? null : clean(b.location, 120)
  if (form.name === "required" && !name)
    errors.name = "Please tell us your name"
  if (email && !z.string().email().safeParse(email).success)
    errors.email = "Enter a valid email address"
  if (phone && !/^[+\d\s().-]{5,}$/.test(phone))
    errors.phone = "Enter a valid phone number"
  if (form.email === "required" && !email)
    errors.email ??= "Please add your email"
  if (form.phone === "required" && !phone)
    errors.phone ??= "Please add your phone number"
  if (form.location === "required" && !typedLocation)
    errors.location = "Please tell us where you are"
  if (
    form.emailOrPhone &&
    form.email !== "off" &&
    form.phone !== "off" &&
    !email &&
    !phone
  )
    errors.email = "Please add an email or a phone number"
  if (Object.keys(errors).length) return { ok: false, errors }
  return { ok: true, details: { name, email, phone, typedLocation } }
}

/** The page a chat came from: path only, since query strings and fragments can hold private tokens. */
export const cleanPage = (
  raw: string | null | undefined,
  redact?: (path: string) => string,
) => {
  if (!raw) return null
  try {
    const path = new URL(raw, "https://placeholder.invalid").pathname.slice(
      0,
      300,
    )
    return clean(redact ? redact(path) : path, 300)
  } catch {
    return null
  }
}

type Cf = {
  country?: string
  region?: string
  city?: string
  timezone?: string
}

/**
 * Approximate location from what the platform in front of the app reports. Cloudflare gives it directly; other hosts
 * use headers. On a host with no such proxy a visitor could fake these, so treat it as a hint and never as proof.
 */
export const locationFromRequest = (req: Request): VisitorDetails => {
  const cf = (req as Request & { cf?: Cf }).cf
  const h = (name: string) => {
    const v = req.headers.get(name)
    if (!v) return null
    try {
      return decodeURIComponent(v)
    } catch {
      return v
    }
  }
  const country = clean(
    cf?.country ??
      h("cf-ipcountry") ??
      h("x-vercel-ip-country") ??
      h("x-appengine-country"),
    8,
  )
  return {
    // Cloudflare reports XX and T1 for unknown and Tor.
    country:
      country &&
      /^[A-Z]{2}$/.test(country) &&
      country !== "XX" &&
      country !== "T1"
        ? country
        : null,
    region: clean(
      cf?.region ??
        h("cf-region") ??
        h("x-vercel-ip-country-region") ??
        h("x-appengine-region"),
      80,
    ),
    city: clean(
      cf?.city ??
        h("cf-ipcity") ??
        h("x-vercel-ip-city") ??
        h("x-appengine-city"),
      80,
    ),
    timezone: clean(
      cf?.timezone ?? h("cf-timezone") ?? h("x-vercel-ip-timezone"),
      80,
    ),
  }
}

export const locationLabel = (
  v: Pick<
    Visitor,
    "typedLocation" | "city" | "region" | "country" | "timezone"
  >,
) => {
  if (v.typedLocation) return v.typedLocation
  const place = [v.city, v.region, v.country].filter(Boolean).join(", ")
  return place || v.timezone || null
}

const localTime = (tz: string | null) => {
  if (!tz) return null
  try {
    return new Intl.DateTimeFormat("en", {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
      timeZone: tz,
    }).format(new Date())
  } catch {
    return null
  }
}

/** What the model is told about who it is talking to. */
export const visitorContext = (v: Visitor | null, page: string | null) => {
  const lines: string[] = []
  if (v?.name) lines.push(`Name: ${v.name}`)
  const where = v ? locationLabel(v) : null
  if (where) lines.push(`Approximate location: ${where}`)
  const time = localTime(v?.timezone ?? null)
  if (time) lines.push(`Their local time: ${time}`)
  if (v?.language) lines.push(`Browser language: ${v.language}`)
  if (page) lines.push(`Page they are on: ${page}`)
  return lines.length
    ? `About this visitor:\n<visitor>\n${lines.join("\n")}\n</visitor>\nUse this to fit your answer, such as what "this page" means or local hours. Do not mention their location unless it helps. Use their name only occasionally.`
    : ""
}
