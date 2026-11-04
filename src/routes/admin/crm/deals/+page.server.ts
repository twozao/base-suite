import { fail } from "@sveltejs/kit"
import { z } from "zod"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { isUuid } from "$lib/server/ids"
import { nowIso } from "$lib/server/db/json"
import { DEAL_STAGES, type DealStageId } from "$lib/crm"
import type { Actions, PageServerLoad } from "./$types"

const OPEN_STAGES: DealStageId[] = ["new", "qualified", "proposal"]

export const load: PageServerLoad = async (event) => {
  requireModule("crm")
  await requirePermission(event, "crm.manage")
  const showClosed = event.url.searchParams.get("closed") === "1"
  const since = new Date(Date.now() - 90 * 86400e3).toISOString()
  let q = event.locals.db
    .selectFrom("crm_deals")
    .innerJoin("crm_contacts", "crm_contacts.id", "crm_deals.contact_id")
    .select([
      "crm_deals.id",
      "crm_deals.title",
      "crm_deals.value_cents",
      "crm_deals.currency",
      "crm_deals.stage",
      "crm_deals.expected_close",
      "crm_deals.updated_at",
      "crm_contacts.id as contact_id",
      "crm_contacts.name as contact_name",
      "crm_contacts.email as contact_email",
      "crm_contacts.company as contact_company",
    ])
    .orderBy("crm_deals.updated_at", "desc")
    .limit(500)
  // Won and lost deals drop off the board after 90 days unless asked for.
  if (!showClosed)
    q = q.where((eb) =>
      eb.or([
        eb("crm_deals.stage", "in", OPEN_STAGES),
        eb("crm_deals.updated_at", ">=", since),
      ]),
    )
  const rows = await q.execute()
  const deals = rows.map(
    ({ contact_id, contact_name, contact_email, contact_company, ...d }) => ({
      ...d,
      contact: {
        id: contact_id,
        name: contact_name,
        email: contact_email,
        company: contact_company,
      },
    }),
  )
  return { deals, showClosed }
}

export const actions: Actions = {
  move: async (event) => {
    requireModule("crm")
    const staff = await requirePermission(event, "crm.manage")
    const f = await event.request.formData()
    const id = String(f.get("id") ?? "")
    const stage = z
      .enum(DEAL_STAGES.map((s) => s.id) as [DealStageId, ...DealStageId[]])
      .safeParse(f.get("stage"))
    if (!isUuid(id) || !stage.success)
      return fail(400, { error: "Invalid move" })
    const db = event.locals.db
    const deal = await db
      .updateTable("crm_deals")
      .set({ stage: stage.data, updated_at: nowIso() })
      .where("id", "=", id)
      .returning(["contact_id", "title"])
      .executeTakeFirst()
    if (deal) {
      await db
        .insertInto("crm_activities")
        .values({
          contact_id: deal.contact_id,
          kind: "deal",
          body: `"${deal.title}" moved to ${stage.data}`,
          ref_type: "deal",
          ref_id: id,
          actor_id: staff.userId,
        })
        .execute()
      if (stage.data === "won")
        await db
          .updateTable("crm_contacts")
          .set({ status: "customer", updated_at: nowIso() })
          .where("id", "=", deal.contact_id)
          .execute()
    }
    return { message: "Deal moved" }
  },
}
