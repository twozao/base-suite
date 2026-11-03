import { error, fail, redirect } from "@sveltejs/kit"
import { z } from "zod"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { isUuid } from "$lib/server/ids"
import { audit } from "$lib/server/audit"
import type { Actions, PageServerLoad, RequestEvent } from "./$types"

const guard = async (event: RequestEvent) => {
  requireModule("crm")
  const staff = await requirePermission(event, "crm.manage")
  if (!isUuid(event.params.id)) error(404, "Not found")
  return staff
}

export const load: PageServerLoad = async (event) => {
  await guard(event)
  const db = event.locals.supabaseServiceRole
  const id = event.params.id
  const [{ data: contact }, { data: activities }, { data: deals }] =
    await Promise.all([
      db.from("crm_contacts").select("*").eq("id", id).maybeSingle(),
      db
        .from("crm_activities")
        .select("id, kind, body, ref_type, ref_id, actor_id, created_at")
        .eq("contact_id", id)
        .order("created_at", { ascending: false })
        .limit(200),
      db
        .from("crm_deals")
        .select(
          "id, title, value_cents, currency, stage, expected_close, updated_at",
        )
        .eq("contact_id", id)
        .order("updated_at", { ascending: false }),
    ])
  if (!contact) error(404, "Contact not found")
  return { contact, activities: activities ?? [], deals: deals ?? [] }
}

const details = z.object({
  name: z.string().trim().max(200),
  company: z.string().trim().max(200),
  phone: z.string().trim().max(60),
  status: z.enum(["lead", "customer", "archived"]),
  tags: z.string().max(400),
  notes: z.string().max(20000),
})
const activity = z.object({
  kind: z.enum(["note", "call", "email", "meeting"]),
  body: z.string().trim().min(1, "Write something").max(5000),
})
const deal = z.object({
  title: z.string().trim().min(1, "Deal needs a title").max(200),
  value: z.coerce.number().min(0).max(1_000_000_000),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Currency like USD"),
  expected_close: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/),
})

export const actions: Actions = {
  save: async (event) => {
    await guard(event)
    const f = await event.request.formData()
    const p = details.safeParse(
      Object.fromEntries(
        ["name", "company", "phone", "status", "tags", "notes"].map((k) => [
          k,
          String(f.get(k) ?? ""),
        ]),
      ),
    )
    if (!p.success) return fail(400, { error: p.error.issues[0].message })
    const tags = [
      ...new Set(
        p.data.tags
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
      ),
    ].slice(0, 20)
    const { error: e } = await event.locals.supabaseServiceRole
      .from("crm_contacts")
      .update({
        name: p.data.name || null,
        company: p.data.company || null,
        phone: p.data.phone || null,
        status: p.data.status,
        tags,
        notes: p.data.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", event.params.id)
    if (e) return fail(500, { error: "Could not save" })
    await audit(
      event,
      "crm.contact_updated",
      { type: "crm_contact", id: event.params.id },
      { status: p.data.status },
    )
    return { message: "Saved" }
  },
  log: async (event) => {
    const staff = await guard(event)
    const f = await event.request.formData()
    const p = activity.safeParse({ kind: f.get("kind"), body: f.get("body") })
    if (!p.success) return fail(400, { error: p.error.issues[0].message })
    const db = event.locals.supabaseServiceRole
    await db.from("crm_activities").insert({
      contact_id: event.params.id,
      kind: p.data.kind,
      body: p.data.body,
      actor_id: staff.userId,
    })
    await db
      .from("crm_contacts")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("id", event.params.id)
    return { message: "Logged" }
  },
  addDeal: async (event) => {
    const staff = await guard(event)
    const f = await event.request.formData()
    const p = deal.safeParse({
      title: f.get("title"),
      value: f.get("value") || 0,
      currency: f.get("currency") || "USD",
      expected_close: f.get("expected_close") ?? "",
    })
    if (!p.success) return fail(400, { error: p.error.issues[0].message })
    const db = event.locals.supabaseServiceRole
    const { data, error: e } = await db
      .from("crm_deals")
      .insert({
        contact_id: event.params.id,
        title: p.data.title,
        value_cents: Math.round(p.data.value * 100),
        currency: p.data.currency,
        expected_close: p.data.expected_close || null,
        owner_id: staff.userId,
      })
      .select("id")
      .single()
    if (e) return fail(500, { error: "Could not create deal" })
    await db.from("crm_activities").insert({
      contact_id: event.params.id,
      kind: "deal",
      body: `Deal created: ${p.data.title}`,
      ref_type: "deal",
      ref_id: data.id,
      actor_id: staff.userId,
    })
    return { message: "Deal added" }
  },
  delete: async (event) => {
    await requirePermission(event, "users.manage_roles") // admins only
    if (!isUuid(event.params.id)) error(404, "Not found")
    await event.locals.supabaseServiceRole
      .from("crm_contacts")
      .delete()
      .eq("id", event.params.id)
    await audit(event, "crm.contact_deleted", {
      type: "crm_contact",
      id: event.params.id,
    })
    redirect(303, "/admin/crm")
  },
}
