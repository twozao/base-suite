import { error, fail, redirect } from "@sveltejs/kit"
import { z } from "zod"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { isUuid } from "$lib/server/ids"
import { nowIso, parseStringList } from "$lib/server/db/json"
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
  const db = event.locals.db
  const id = event.params.id
  const [contact, activities, deals] = await Promise.all([
    db
      .selectFrom("crm_contacts")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst(),
    db
      .selectFrom("crm_activities")
      .select([
        "id",
        "kind",
        "body",
        "ref_type",
        "ref_id",
        "actor_id",
        "created_at",
      ])
      .where("contact_id", "=", id)
      .orderBy("created_at", "desc")
      .orderBy("id", "desc")
      .limit(200)
      .execute(),
    db
      .selectFrom("crm_deals")
      .select([
        "id",
        "title",
        "value_cents",
        "currency",
        "stage",
        "expected_close",
        "updated_at",
      ])
      .where("contact_id", "=", id)
      .orderBy("updated_at", "desc")
      .execute(),
  ])
  if (!contact) error(404, "Contact not found")
  return {
    contact: { ...contact, tags: parseStringList(contact.tags) },
    activities,
    deals,
  }
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
    try {
      await event.locals.db
        .updateTable("crm_contacts")
        .set({
          name: p.data.name || null,
          company: p.data.company || null,
          phone: p.data.phone || null,
          status: p.data.status,
          tags: JSON.stringify(tags),
          notes: p.data.notes || null,
          updated_at: nowIso(),
        })
        .where("id", "=", event.params.id)
        .execute()
    } catch {
      return fail(500, { error: "Could not save" })
    }
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
    const db = event.locals.db
    await db
      .insertInto("crm_activities")
      .values({
        contact_id: event.params.id,
        kind: p.data.kind,
        body: p.data.body,
        actor_id: staff.userId,
      })
      .execute()
    await db
      .updateTable("crm_contacts")
      .set({ last_activity_at: nowIso() })
      .where("id", "=", event.params.id)
      .execute()
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
    const db = event.locals.db
    const dealId = crypto.randomUUID()
    try {
      await db
        .insertInto("crm_deals")
        .values({
          id: dealId,
          contact_id: event.params.id,
          title: p.data.title,
          value_cents: Math.round(p.data.value * 100),
          currency: p.data.currency,
          expected_close: p.data.expected_close || null,
          owner_id: staff.userId,
        })
        .execute()
    } catch {
      return fail(500, { error: "Could not create deal" })
    }
    await db
      .insertInto("crm_activities")
      .values({
        contact_id: event.params.id,
        kind: "deal",
        body: `Deal created: ${p.data.title}`,
        ref_type: "deal",
        ref_id: dealId,
        actor_id: staff.userId,
      })
      .execute()
    return { message: "Deal added" }
  },
  delete: async (event) => {
    await requirePermission(event, "users.manage_roles") // admins only
    if (!isUuid(event.params.id)) error(404, "Not found")
    await event.locals.db
      .deleteFrom("crm_contacts")
      .where("id", "=", event.params.id)
      .execute()
    await audit(event, "crm.contact_deleted", {
      type: "crm_contact",
      id: event.params.id,
    })
    redirect(303, "/admin/crm")
  },
}
