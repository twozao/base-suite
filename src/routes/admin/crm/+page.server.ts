import { error, fail, redirect } from "@sveltejs/kit"
import { z } from "zod"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { ilikeTerm, pageParams, searchParam } from "$lib/server/pagination"
import { audit } from "$lib/server/audit"
import type { Actions, PageServerLoad } from "./$types"

const STATUSES = ["lead", "customer", "archived"] as const

export const load: PageServerLoad = async (event) => {
  requireModule("crm")
  await requirePermission(event, "crm.manage")
  const q = searchParam(event.url)
  const status = event.url.searchParams.get("status") ?? ""
  const { page, size, from, to } = pageParams(event.url)
  const db = event.locals.supabaseServiceRole
  let query = db
    .from("crm_contacts")
    .select(
      "id, email, name, company, status, source, tags, last_activity_at",
      { count: "exact" },
    )
    .order("last_activity_at", { ascending: false })
    .range(from, to)
  if ((STATUSES as readonly string[]).includes(status))
    query = query.eq("status", status as (typeof STATUSES)[number])
  else query = query.neq("status", "archived")
  if (q) {
    const t = ilikeTerm(q)
    query = query.or(`email.ilike.${t},name.ilike.${t},company.ilike.${t}`)
  }
  const head = { count: "exact" as const, head: true }
  const weekAgo = new Date(Date.now() - 7 * 86400e3).toISOString()
  const [{ data, count, error: e }, leads, customers, newThisWeek] =
    await Promise.all([
      query,
      db.from("crm_contacts").select("id", head).eq("status", "lead"),
      db.from("crm_contacts").select("id", head).eq("status", "customer"),
      db.from("crm_contacts").select("id", head).gte("created_at", weekAgo),
    ])
  if (e) error(500, "Could not load contacts")
  return {
    rows: data ?? [],
    total: count ?? 0,
    page,
    size,
    q,
    status,
    stats: {
      leads: leads.count ?? 0,
      customers: customers.count ?? 0,
      newThisWeek: newThisWeek.count ?? 0,
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
    const { data, error: e } = await event.locals.supabaseServiceRole
      .from("crm_contacts")
      .insert({
        name: d.name || null,
        email: d.email || null,
        company: d.company || null,
        phone: d.phone || null,
        source: "manual",
        owner_id: staff.userId,
      })
      .select("id")
      .single()
    if (e)
      return fail(e.code === "23505" ? 400 : 500, {
        error:
          e.code === "23505"
            ? "A contact with this email already exists"
            : "Could not create contact",
      })
    await audit(event, "crm.contact_created", {
      type: "crm_contact",
      id: data.id,
    })
    redirect(303, `/admin/crm/${data.id}`)
  },
}
