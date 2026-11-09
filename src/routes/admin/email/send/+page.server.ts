import { fail } from "@sveltejs/kit"
import { z } from "zod"
import { sendTemplatedEmail } from "$lib/mailer"
import { audit } from "$lib/server/audit"
import { fromEmail } from "$lib/server/auth/flows"
import { requirePermission } from "$lib/server/auth/staff"
import { parseStringList } from "$lib/server/db/json"
import { BUILT_IN_TEMPLATES } from "$lib/server/email"
import { getSettings } from "$lib/server/settings"
import type { Actions, PageServerLoad } from "./$types"

const MAX_RECIPIENTS = 10

/** Templates staff may send by hand: everything except the sign-in and reset emails. */
const sendable = async (db: App.Locals["db"]) => {
  const saved = await db
    .selectFrom("email_templates")
    .select(["slug", "name", "subject", "variables_json"])
    .orderBy("name")
    .execute()
  const list = BUILT_IN_TEMPLATES.filter((t) => !t.sensitive).map((t) => {
    const s = saved.find((x) => x.slug === t.slug)
    return {
      slug: t.slug,
      name: t.name,
      variables: s ? parseStringList(s.variables_json) : t.variables,
      asksSubject: !s || s.subject.includes("{{subject}}"),
    }
  })
  for (const s of saved)
    if (!BUILT_IN_TEMPLATES.some((t) => t.slug === s.slug))
      list.push({
        slug: s.slug,
        name: s.name,
        variables: parseStringList(s.variables_json),
        asksSubject: s.subject.includes("{{subject}}"),
      })
  return list
}

export const load: PageServerLoad = async (event) => {
  await requirePermission(event, "email.manage")
  const { brand } = await getSettings(event.locals.db)
  return {
    templates: await sendable(event.locals.db),
    defaults: {
      siteName: brand.siteName,
      companyName: brand.siteName,
      color: brand.primaryColor,
    },
    preselect: event.url.searchParams.get("template") ?? "",
  }
}

const sendSchema = z.object({
  template: z.string().min(1).max(60),
  to: z
    .string()
    .max(4000)
    .transform((s) => [
      ...new Set(
        s
          .split(/[\s,;]+/)
          .map((x) => x.trim().toLowerCase())
          .filter(Boolean),
      ),
    ])
    .pipe(
      z
        .array(z.string().email("One of the addresses is not valid").max(320))
        .min(1, "Add at least one address")
        .max(MAX_RECIPIENTS, `Up to ${MAX_RECIPIENTS} addresses at a time`),
    ),
  subject: z.string().trim().max(300),
})

export const actions: Actions = {
  default: async (event) => {
    const staff = await requirePermission(event, "email.manage")
    const db = event.locals.db
    const form = await event.request.formData()
    const parsed = sendSchema.safeParse({
      template: form.get("template"),
      to: form.get("to") ?? "",
      subject: form.get("subject") ?? "",
    })
    if (!parsed.success)
      return fail(400, { error: parsed.error.issues[0].message })
    const tpl = (await sendable(db)).find(
      (t) => t.slug === parsed.data.template,
    )
    if (!tpl) return fail(400, { error: "Pick a template" })
    if (tpl.asksSubject && !parsed.data.subject)
      return fail(400, { error: "Add a subject" })
    const vars: Record<string, string> = {}
    for (const v of tpl.variables)
      vars[v] = String(form.get(`var_${v}`) ?? "").slice(0, 5000)
    // One email per address, so recipients never see each other.
    const results = []
    for (const to of parsed.data.to)
      results.push(
        await sendTemplatedEmail({
          db,
          subject: parsed.data.subject || tpl.name,
          to_emails: [to],
          from_email: fromEmail(),
          template_name: tpl.slug,
          template_properties: vars,
          source: "admin",
          sent_by: staff.userId,
        }),
      )
    const sent = results.filter((r) => r.status === "sent").length
    await audit(
      event,
      "email.sent",
      { type: "email_template", id: tpl.slug },
      { recipients: parsed.data.to.length, sent },
    )
    if (sent === results.length)
      return { message: `Sent ${sent} email${sent === 1 ? "" : "s"}` }
    const first = results.find((r) => r.status !== "sent")
    return fail(400, {
      error: `${sent} of ${results.length} sent. ${first?.status}: ${first?.error ?? ""} See Sent mail for details.`,
    })
  },
}
