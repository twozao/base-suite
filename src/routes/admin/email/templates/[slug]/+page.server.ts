import { error, fail, redirect } from "@sveltejs/kit"
import { fileTemplate, renderEmail, sendTemplatedEmail } from "$lib/mailer"
import { audit } from "$lib/server/audit"
import { fromEmail } from "$lib/server/auth/flows"
import { requirePermission } from "$lib/server/auth/staff"
import { parseStringList } from "$lib/server/db/json"
import {
  BUILT_IN_TEMPLATES,
  emailTemplateSchema,
  findTemplate,
  sampleVars,
  saveTemplate,
  variablesIn,
} from "$lib/server/email"
import { getSettings } from "$lib/server/settings"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  await requirePermission(event, "email.manage")
  const db = event.locals.db
  const slug = event.params.slug
  if (slug === "new")
    return {
      isNew: true,
      builtIn: null,
      saved: false,
      extensionId: null,
      template: {
        slug: "",
        name: "",
        description: "",
        subject: "",
        html: "",
        text: "",
      },
      variables: [] as string[],
      preview: null,
    }
  const builtIn = BUILT_IN_TEMPLATES.find((t) => t.slug === slug) ?? null
  const saved = await findTemplate(db, slug)
  if (!saved && !builtIn) error(404, "No such template")
  const file = builtIn ? fileTemplate(slug) : null
  const template = saved
    ? {
        slug,
        name: saved.name,
        description: saved.description ?? "",
        subject: saved.subject,
        html: saved.html ?? "",
        text: saved.text ?? "",
      }
    : {
        slug,
        name: builtIn!.name,
        description: builtIn!.description,
        subject: "{{subject}}",
        html: file?.html ?? "",
        text: file?.text ?? "",
      }
  const variables = saved
    ? parseStringList(saved.variables_json)
    : builtIn!.variables
  const { brand } = await getSettings(db)
  const preview = await renderEmail(
    db,
    slug,
    `${builtIn?.name ?? template.name} (sample subject)`,
    sampleVars(variables, brand, event.url.origin),
  )
  return {
    isNew: false,
    builtIn: builtIn && { name: builtIn.name, sensitive: !!builtIn.sensitive },
    saved: !!saved,
    extensionId: saved?.extension_id ?? null,
    template,
    variables,
    preview,
  }
}

export const actions: Actions = {
  save: async (event) => {
    const staff = await requirePermission(event, "email.manage")
    const db = event.locals.db
    const form = await event.request.formData()
    const isNew = event.params.slug === "new"
    const slug = isNew
      ? String(form.get("slug") ?? "").trim()
      : event.params.slug
    const parsed = emailTemplateSchema.safeParse({
      slug,
      name: form.get("name"),
      description: form.get("description") ?? "",
      subject: form.get("subject"),
      html: form.get("html") ?? "",
      text: form.get("text") ?? "",
    })
    if (!parsed.success) {
      const i = parsed.error.issues[0]
      return fail(400, { error: `${i.path.join(".")}: ${i.message}` })
    }
    if (isNew) {
      if (BUILT_IN_TEMPLATES.some((t) => t.slug === slug))
        return fail(400, {
          error: "That id belongs to a built-in email: open it to customize it",
        })
      if (await findTemplate(db, slug))
        return fail(400, { error: "A template with that id already exists" })
    } else if (
      !(await findTemplate(db, slug)) &&
      !BUILT_IN_TEMPLATES.some((t) => t.slug === slug)
    )
      error(404, "No such template")
    const builtIn = BUILT_IN_TEMPLATES.find((t) => t.slug === slug)
    const found = variablesIn(
      parsed.data.subject,
      parsed.data.html,
      parsed.data.text,
    )
    const variables = builtIn
      ? [...new Set([...builtIn.variables, ...found])]
      : found
    await saveTemplate(db, { ...parsed.data, variables }, staff.userId)
    await audit(event, "email.template_saved", {
      type: "email_template",
      id: slug,
    })
    if (isNew) redirect(303, `/admin/email/templates/${slug}`)
    return { message: "Template saved" }
  },
  remove: async (event) => {
    await requirePermission(event, "email.manage")
    const slug = event.params.slug
    const db = event.locals.db
    const r = await db
      .deleteFrom("email_templates")
      .where("slug", "=", slug)
      .executeTakeFirst()
    if (!Number(r.numDeletedRows))
      return fail(400, { error: "Nothing to remove" })
    await audit(event, "email.template_deleted", {
      type: "email_template",
      id: slug,
    })
    if (BUILT_IN_TEMPLATES.some((t) => t.slug === slug))
      return { message: "Back to the built-in version" }
    redirect(303, "/admin/email/templates")
  },
  test: async (event) => {
    const staff = await requirePermission(event, "email.manage")
    const db = event.locals.db
    const slug = event.params.slug
    if (!staff.email)
      return fail(400, { error: "Your account has no email address" })
    const saved = await findTemplate(db, slug)
    const builtIn = BUILT_IN_TEMPLATES.find((t) => t.slug === slug)
    if (!saved && !builtIn) error(404, "No such template")
    const variables = saved
      ? parseStringList(saved.variables_json)
      : builtIn!.variables
    const { brand } = await getSettings(db)
    const r = await sendTemplatedEmail({
      db,
      subject: `Test: ${saved?.name ?? builtIn!.name}`,
      to_emails: [staff.email],
      from_email: fromEmail(),
      template_name: slug,
      template_properties: sampleVars(variables, brand, event.url.origin),
      source: "test",
      sent_by: staff.userId,
    })
    if (r.status === "sent") return { message: `Test sent to ${staff.email}` }
    return fail(400, {
      error: `Not sent (${r.status}): ${r.error ?? "unknown error"}. It is in the log.`,
    })
  },
}
