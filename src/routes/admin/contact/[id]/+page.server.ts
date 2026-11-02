import { error, fail } from "@sveltejs/kit"
import { z } from "zod"
import { isUuid } from "$lib/server/ids"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { audit } from "$lib/server/audit"
import type { Actions, PageServerLoad } from "./$types"

const updateSchema = z.object({
  status: z.enum(["new", "open", "closed", "spam"]),
  admin_notes: z.string().max(10000),
})

export const load: PageServerLoad = async (event) => {
  requireModule("contact")
  await requirePermission(event, "contact.manage")
  if (!isUuid(event.params.id)) error(404, "Not found")
  const db = event.locals.supabaseServiceRole
  const { data } = await db
    .from("contact_requests")
    .select("*")
    .eq("id", event.params.id)
    .maybeSingle()
  if (!data) error(404, "Not found")

  // Mark as opened on first view
  if (data.status === "new") {
    await db
      .from("contact_requests")
      .update({ status: "open", handled_by: event.locals.user!.id })
      .eq("id", data.id)
    data.status = "open"
  }
  return { request: data }
}

export const actions: Actions = {
  update: async (event) => {
    requireModule("contact")
    await requirePermission(event, "contact.manage")
    if (!isUuid(event.params.id)) error(404, "Not found")
    const form = await event.request.formData()
    const parsed = updateSchema.safeParse({
      status: form.get("status"),
      admin_notes: form.get("admin_notes") ?? "",
    })
    if (!parsed.success) return fail(400, { error: "Invalid input" })
    const { error: e } = await event.locals.supabaseServiceRole
      .from("contact_requests")
      .update({
        ...parsed.data,
        handled_by: event.locals.user!.id,
        updated_at: new Date(),
      })
      .eq("id", event.params.id)
    if (e) return fail(500, { error: "Could not save" })
    await audit(
      event,
      "contact.updated",
      { type: "contact_request", id: event.params.id },
      { status: parsed.data.status },
    )
    return { message: "Saved" }
  },
}
