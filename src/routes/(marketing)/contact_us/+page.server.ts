import { fail } from "@sveltejs/kit"
import { z } from "zod"
import { sendAdminEmail, sendTemplatedEmail } from "$lib/mailer"
import { fromEmail, mailConfigured } from "$lib/server/auth/flows"
import { requireModule } from "$lib/server/auth/staff"
import { captureLead } from "$lib/server/crm"
import { getSettings } from "$lib/server/settings"
import { clientIp } from "$lib/server/security/request"
import { rateLimit, RATE_LIMITS } from "$lib/server/security/rate_limit"
import type { Actions, PageServerLoad } from "./$types"

const MESSAGE_MIN = 10
const MESSAGE_MAX = 2000
/** Faster than this is a script, not a person. */
const MIN_FILL_MS = 2000
/** More links than this files the message under spam for a person to check; nothing is lost. */
const MAX_LINKS = 3

export const load: PageServerLoad = async ({ locals }) => {
  requireModule("contact")
  const { contact, general } = await getSettings(locals.db)
  let prefill = { name: "", email: "" }
  if (locals.user) {
    const profile = await locals.db
      .selectFrom("profiles")
      .select("full_name")
      .where("id", "=", locals.user.id)
      .executeTakeFirst()
    prefill = { name: profile?.full_name ?? "", email: locals.user.email }
  }
  const privacy = await locals.db
    .selectFrom("cms_pages")
    .select("slug")
    .where("slug", "=", "privacy")
    .where("status", "=", "published")
    .executeTakeFirst()
  return {
    contact,
    supportEmail: general.supportEmail,
    prefill,
    hasPrivacyPage: !!privacy,
    messageMin: MESSAGE_MIN,
    messageMax: MESSAGE_MAX,
  }
}

const baseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Please enter your name")
    .max(200, "That name is too long"),
  email: z
    .string()
    .trim()
    .max(320, "That email is too long")
    .email("Enter a valid email address"),
  company: z.string().trim().max(200, "That company name is too long"),
  phone: z
    .string()
    .trim()
    .max(60, "That number is too long")
    .refine(
      (v) => !v || /^[+\d\s().-]{5,}$/.test(v),
      "Enter a valid phone number",
    ),
  topic: z.string().trim().max(120),
  preferred_contact: z.enum(["email", "phone"]),
  message: z
    .string()
    .trim()
    .min(
      MESSAGE_MIN,
      `Please tell us a little more (at least ${MESSAGE_MIN} characters)`,
    )
    .max(MESSAGE_MAX, `Please keep it under ${MESSAGE_MAX} characters`),
})

export const actions: Actions = {
  submitContactUs: async (event) => {
    requireModule("contact")
    const { request, locals, url } = event
    const db = locals.db
    const f = await request.formData()
    const read = (k: string) => f.get(k)?.toString() ?? ""
    const reference = crypto.randomUUID()
    // Tripped spam traps look like success, so bots learn nothing.
    const shownAt = Number(read("shown_at"))
    if (read("website_url") || (shownAt && Date.now() - shownAt < MIN_FILL_MS))
      return { success: true, reference: reference.slice(0, 8) }

    const values = {
      name: read("name"),
      email: read("email"),
      company: read("company"),
      phone: read("phone"),
      topic: read("topic"),
      preferred_contact: read("preferred_contact") || "email",
      message: read("message"),
    }
    const { contact, brand } = await getSettings(db)
    const parsed = baseSchema.safeParse(values)
    const errors: Record<string, string> = {}
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        errors[String(issue.path[0] ?? "_")] ??= issue.message
    }
    if (contact.topics.length && !contact.topics.includes(values.topic))
      errors.topic = "Please choose what this is about"
    if (values.preferred_contact === "phone" && !values.phone.trim())
      errors.phone = "Add a number so we can call you"
    if (Object.keys(errors).length || !parsed.success)
      return fail(400, { errors, values })

    if (
      !(await rateLimit(
        db,
        `contact:${clientIp(event)}`,
        RATE_LIMITS.contactForm,
      ))
    )
      return fail(429, {
        errors: { _: "Too many messages. Please try again in a few minutes." },
        values,
      })

    const d = parsed.data
    const spam = (d.message.match(/https?:\/\//gi) ?? []).length > MAX_LINKS
    const from = read("from")
    try {
      await db
        .insertInto("contact_requests")
        .values({
          id: reference,
          first_name: d.name,
          email: d.email.toLowerCase(),
          company_name: d.company || null,
          phone: d.phone || null,
          message_body: d.message,
          topic: d.topic || null,
          preferred_contact: d.preferred_contact,
          source_path:
            from.startsWith("/") && !from.startsWith("//")
              ? from.slice(0, 300)
              : null,
          status: spam ? "spam" : "new",
        })
        .execute()
    } catch (e) {
      console.error(
        "Error saving contact request",
        e instanceof Error ? e.message : e,
      )
      return fail(500, {
        errors: {
          _: "We could not save your message. Please try again, or email us directly.",
        },
        values,
      })
    }
    if (spam) return { success: true, reference: reference.slice(0, 8) }

    await captureLead(db, {
      email: d.email,
      name: d.name,
      company: d.company,
      phone: d.phone,
      userId: locals.user?.id,
      source: "contact_form",
      kind: "contact_form",
      body: d.topic ? `${d.topic}: ${d.message}` : d.message,
    })
    if (contact.notifyAdmin) {
      await sendAdminEmail({
        subject: `New contact request${d.topic ? `: ${d.topic}` : ""}`,
        body: `From: ${d.name} <${d.email}>\nPhone: ${d.phone}\nCompany: ${d.company}\nTopic: ${d.topic}\nPrefers: ${d.preferred_contact}\n\n${d.message}\n\nOpen in admin: ${url.origin}/admin/contact/${reference}`,
      })
    }
    // The address is unverified, so the reply never repeats what was typed into the form.
    if (contact.autoReply && mailConfigured()) {
      await sendTemplatedEmail({
        subject: `We received your message - ${brand.siteName}`,
        to_emails: [d.email],
        from_email: fromEmail(),
        template_name: "notice",
        template_properties: {
          siteName: brand.siteName,
          color: brand.primaryColor,
          heading: "We received your message",
          intro: contact.successMessage,
          details: `Reference: ${reference.slice(0, 8)}`,
          actionLabel: "",
          actionUrl: "",
        },
      })
    }
    return { success: true, reference: reference.slice(0, 8) }
  },
}
