import { fail, redirect } from "@sveltejs/kit"
import { z } from "zod"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { isUniqueViolation } from "$lib/server/db/errors"
import { containsText } from "$lib/server/db/query"
import { pageParams, searchParam } from "$lib/server/pagination"
import { audit } from "$lib/server/audit"
import type { Actions, PageServerLoad } from "./$types"

const STATUSES = ["lead", "customer", "archived"] as const

export const load: PageServerLoad = async (event) => {
  requireModule("crm")
  await requirePermission(event, "crm.manage")
  const q = searchParam(event.url)
  const status = event.url.searchParams.get("status") ?? ""
  const { page, size, from } = pageParams(event.url)
  const db = event.locals.db
  const count = db.fn.countAll<number>().as("n")

  let base = db.selectFrom("crm_contacts")
  if ((STATUSES as readonly string[]).includes(status))
    base = base.where("status", "=", status as (typeof STATUSES)[number])
  else base = base.where("status", "!=", "archived")
  if (q) {
    base = base.where((eb) =>
      eb.or([
        containsText("email", q),
        containsText("name", q),
        containsText("company", q),
      ]),
    )
  }
  const weekAgo = new Date(Date.now() - 7 * 86400e3).toISOString()
  const [{ n }, rows, leads, customers, newThisWeek] = await Promise.all([
    base.select(count).executeTakeFirstOrThrow(),
    base
      .select([
        "id",
        "email",
        "name",
        "company",
        "status",
        "source",
        "last_activity_at",
      ])
      .orderBy("last_activity_at", "desc")
      .limit(size)
      .offset(from)
      .execute(),
    db
      .selectFrom("crm_contacts")
      .select(count)
      .where("status", "=", "lead")
      .executeTakeFirstOrThrow(),
    db
      .selectFrom("crm_contacts")
      .select(count)
      .where("status", "=", "customer")
      .executeTakeFirstOrThrow(),
    db
      .selectFrom("crm_contacts")
      .select(count)
      .where("created_at", ">=", weekAgo)
      .executeTakeFirstOrThrow(),
  ])
  return {
    rows,
    total: Number(n),
    page,
    size,
    q,
    status,
    stats: {
      leads: Number(leads.n),
      customers: Number(customers.n),
      newThisWeek: Number(newThisWeek.n),
    },
  }
}

const newContact = z.object({
  name: z.string().trim().max(200),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(320)
    .email("Invalid email")
    .or(z.literal("")),
  company: z.string().trim().max(200),
  phone: z.string().trim().max(60),
})

export const actions: Actions = {
  create: async (event) => {
    requireModule("crm")
    const staff = await requirePermission(event, "crm.manage")
    const f = await event.request.formData()
    const parsed = newContact.safeParse(
      Object.fromEntries(
        ["name", "email", "company", "phone"].map((k) => [
          k,
          String(f.get(k) ?? ""),
        ]),
      ),
    )
    if (!parsed.success)
      return fail(400, { error: parsed.error.issues[0].message })
    const d = parsed.data
    if (!d.name && !d.email)
      return fail(400, { error: "Add a name or an email" })
    const id = crypto.randomUUID()
    try {
      await event.locals.db
        .insertInto("crm_contacts")
        .values({
          id,
          name: d.name || null,
          email: d.email || null,
          company: d.company || null,
          phone: d.phone || null,
          source: "manual",
          owner_id: staff.userId,
        })
        .execute()
    } catch (e) {
      if (isUniqueViolation(e))
        return fail(400, { error: "A contact with this email already exists" })
      return fail(500, { error: "Could not create contact" })
    }
    await audit(event, "crm.contact_created", { type: "crm_contact", id })
    redirect(303, `/admin/crm/${id}`)
  },
}
