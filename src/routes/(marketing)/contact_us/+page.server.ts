import { error, fail } from "@sveltejs/kit"
import { z } from "zod"
import { sendAdminEmail } from "$lib/mailer.js"
import { requireModule } from "$lib/server/auth/staff"
import { getSettings } from "$lib/server/settings"
import { clientIp } from "$lib/server/security/request"
import { rateLimit, RATE_LIMITS } from "$lib/server/security/rate_limit"
import type { Actions, PageServerLoad } from "./$types"

const contactSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(2, "First name is required")
    .max(500, "First name too long"),
  last_name: z
    .string()
    .trim()
    .min(2, "Last name is required")
    .max(500, "Last name too long"),
  email: z.string().trim().max(500, "Email too long").email("Invalid email"),
  company: z.string().trim().max(500, "Company too long"),
  phone: z.string().trim().max(100, "Phone number too long"),
  message: z
    .string()
    .trim()
    .max(2000, "Message too long (max 2000 characters)"),
})

export const load: PageServerLoad = async ({ locals }) => {
  requireModule("contact")
  const settings = await getSettings(locals.supabaseServiceRole)
  return {
    successMessage: settings.contact.successMessage,
    supportEmail: settings.general.supportEmail,
  }
}

export const actions: Actions = {
  submitContactUs: async (event) => {
    requireModule("contact")
    const {
      request,
      locals: { supabaseServiceRole },
    } = event
    const formData = await request.formData()

    // Honeypot tripped: pretend success so bots learn nothing.
    if (formData.get("website_url")) return { success: true }

    const raw = Object.fromEntries(
      ["first_name", "last_name", "email", "company", "phone", "message"].map(
        (k) => [k, formData.get(k)?.toString() ?? ""],
      ),
    )
    const parsed = contactSchema.safeParse(raw)
    if (!parsed.success) {
      const errors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "_")
        errors[key] ??= issue.message
      }
      return fail(400, { errors })
    }

    const allowed = await rateLimit(
      supabaseServiceRole,
      `contact:${clientIp(event)}`,
      RATE_LIMITS.contactForm,
    )
    if (!allowed) {
      return fail(429, {
        errors: { _: "Too many messages. Please try again in a few minutes." },
      })
    }

    const d = parsed.data
    const { error: insertError } = await supabaseServiceRole
      .from("contact_requests")
      .insert({
        first_name: d.first_name,
        last_name: d.last_name,
        email: d.email.toLowerCase(),
        company_name: d.company,
        phone: d.phone,
        message_body: d.message,
        updated_at: new Date(),
      })

    if (insertError) {
      console.error("Error saving contact request", insertError.message)
      error(500, "Error saving your message")
    }

    const settings = await getSettings(supabaseServiceRole)
    if (settings.contact.notifyAdmin) {
      await sendAdminEmail({
        subject: "New contact request",
        body: `New contact request from ${d.first_name} ${d.last_name}.\n\nEmail: ${d.email}\n\nPhone: ${d.phone}\n\nCompany: ${d.company}\n\nMessage: ${d.message}\n\nOpen in admin: ${event.url.origin}/admin/contact`,
      })
    }
    return { success: true }
  },
}
