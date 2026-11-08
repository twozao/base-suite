import { fail, redirect } from "@sveltejs/kit"
import { z } from "zod"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { audit } from "$lib/server/audit"
import { slugify } from "$lib/server/cms/pages"
import { isUniqueViolation } from "$lib/server/db/errors"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  requireModule("forms")
  await requirePermission(event, "forms.manage")
  const db = event.locals.db
  const [forms, counts] = await Promise.all([
    db
      .selectFrom("forms")
      .select(["id", "slug", "title", "active", "updated_at"])
      .orderBy("title")
      .execute(),
    db
      .selectFrom("form_submissions")
      .select(["form_id", (eb) => eb.fn.countAll<number>().as("n")])
      .where("status", "=", "new")
      .groupBy("form_id")
      .execute(),
  ])
  return {
    forms: forms.map((f) => ({
      ...f,
      unread: Number(counts.find((c) => c.form_id === f.id)?.n ?? 0),
    })),
  }
}

export const actions: Actions = {
  create: async (event) => {
    requireModule("forms")
    await requirePermission(event, "forms.manage")
    const title = z
      .string()
      .trim()
      .min(1)
      .max(200)
      .safeParse((await event.request.formData()).get("title"))
    if (!title.success) return fail(400, { error: "Give the form a title" })
    const id = crypto.randomUUID()
    const slug = slugify(title.data) || `form-${id.slice(0, 8)}`
    try {
      await event.locals.db
        .insertInto("forms")
        .values({
          id,
          slug,
          title: title.data,
          active: 0,
          fields: JSON.stringify([
            {
              id: "name",
              label: "Your name",
              kind: "text",
              required: true,
              help: "",
              options: [],
            },
            {
              id: "email",
              label: "Email",
              kind: "email",
              required: true,
              help: "",
              options: [],
            },
          ]),
        })
        .execute()
    } catch (e) {
      if (isUniqueViolation(e))
        return fail(400, { error: "A form with this address exists" })
      throw e
    }
    await audit(event, "form.saved", { type: "form", id })
    redirect(303, `/admin/forms/${id}`)
  },
}
