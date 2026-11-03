import { error, fail } from "@sveltejs/kit"
import { z } from "zod"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { isUuid } from "$lib/server/ids"
import { DEAL_STAGES } from "$lib/crm"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  requireModule("crm")
  await requirePermission(event, "crm.manage")
  const showClosed = event.url.searchParams.get("closed") === "1"
  const since = new Date(Date.now() - 90 * 86400e3).toISOString()
  let q = event.locals.supabaseServiceRole
    .from("crm_deals")
    .select(
      "id, title, value_cents, currency, stage, expected_close, updated_at, contact:crm_contacts(id, name, email, company)",
    )
    .order("updated_at", { ascending: false })
    .limit(500)
  if (!showClosed)
    q = q.or(`stage.in.(new,qualified,proposal),updated_at.gte.${since}`)
  const { data, error: e } = await q
  if (e) error(500, "Could not load deals")
  return { deals: data ?? [], showClosed }
}

export const actions: Actions = {
  move: async (event) => {
    requireModule("crm")
    const staff = await requirePermission(event, "crm.manage")
    const f = await event.request.formData()
    const id = String(f.get("id") ?? "")
    const stage = z
      .enum(DEAL_STAGES.map((s) => s.id) as [string, ...string[]])
      .safeParse(f.get("stage"))
    if (!isUuid(id) || !stage.success)
      return fail(400, { error: "Invalid move" })
    const db = event.locals.supabaseServiceRole
    const { data: deal } = await db
      .from("crm_deals")
      .update({
        stage: stage.data as never,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("contact_id, title")
      .single()
    if (deal) {
      await db.from("crm_activities").insert({
        contact_id: deal.contact_id,
        kind: "deal",
        body: `“${deal.title}” moved to ${stage.data}`,
        ref_type: "deal",
        ref_id: id,
        actor_id: staff.userId,
      })
      if (stage.data === "won")
        await db
          .from("crm_contacts")
          .update({ status: "customer" })
          .eq("id", deal.contact_id)
    }
    return { message: "Deal moved" }
  },
}
