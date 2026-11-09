import { error, fail } from "@sveltejs/kit"
import { sendAdminEmail } from "$lib/mailer"
import { requireModule } from "$lib/server/auth/staff"
import { parseFields, parseSubmission } from "$lib/server/forms"
import { emit } from "$lib/server/plugins/events"
import { clientIp } from "$lib/server/security/request"
import { rateLimit, RATE_LIMITS } from "$lib/server/security/rate_limit"
import type { Actions, PageServerLoad } from "./$types"

const liveForm = async (db: App.Locals["db"], slug: string) => {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return null
  const f = await db
    .selectFrom("forms")
    .selectAll()
    .where("slug", "=", slug)
    .where("active", "=", 1)
    .executeTakeFirst()
  return f ? { ...f, fields: parseFields(f.fields) } : null
}

export const load: PageServerLoad = async ({ params, locals }) => {
  requireModule("forms")
  const f = await liveForm(locals.db, params.slug)
  if (!f) error(404, "Form not found")
  return {
    form: {
      title: f.title,
      description: f.description,
      fields: f.fields,
      submit_label: f.submit_label,
    },
  }
}

export const actions: Actions = {
  default: async (event) => {
    requireModule("forms")
    const db = event.locals.db
    const f = await liveForm(db, event.params.slug)
    if (!f) error(404, "Form not found")
    const fd = await event.request.formData()
    const values = Object.fromEntries(
      f.fields.map((x) => [x.id, String(fd.get(x.id) ?? "")]),
    )
    if (String(fd.get("website_url") ?? ""))
      return { sent: true, message: f.success_message }
    if (
      !(await rateLimit(db, `form:${clientIp(event)}`, RATE_LIMITS.formSubmit))
    )
      return fail(429, {
        errors: { _: "Too many answers. Try again in a few minutes." },
        values,
      })
    const r = parseSubmission(f.fields, (id) => String(fd.get(id) ?? ""))
    if (!r.ok) return fail(400, { errors: r.errors, values })
    const id = crypto.randomUUID()
    await db
      .insertInto("form_submissions")
      .values({
        id,
        form_id: f.id,
        answers: JSON.stringify(r.answers),
        email: r.email,
      })
      .execute()
    await emit(db, "form.submitted", { form: f.slug, id, answers: r.answers })
    if (f.notify_admin)
      await sendAdminEmail({
        db: event.locals.db,
        subject: `New answer: ${f.title}`,
        body:
          r.answers.map((a) => `${a.label}: ${a.value}`).join("\n") +
          `\n\n${event.url.origin}/admin/forms/${f.id}/submissions`,
      })
    return { sent: true, message: f.success_message }
  },
}
