import type { Db } from "./db"
import { isUniqueViolation } from "./db/errors"
import { nowIso } from "./db/json"
import type { CrmActivityKind } from "./db/schema"
import { isModuleEnabled } from "$lib/modules"

export type LeadEvent = {
  email?: string | null
  name?: string | null
  company?: string | null
  phone?: string | null
  userId?: string | null
  source: string
  kind: CrmActivityKind
  body?: string | null
  ref?: { type: string; id: string }
}

const clip = (v: string | null | undefined, max: number) => {
  const t = (v ?? "").trim()
  return t ? t.slice(0, max) : null
}

/**
 * Record a customer touchpoint in the CRM: finds or creates the contact by email and appends an
 * activity. Called from other modules (contact form, chat, bookings, newsletter, billing). No-op
 * when the CRM module is off. Never throws: a CRM hiccup must not break the feature that called it.
 */
export const captureLead = async (db: Db, ev: LeadEvent) => {
  if (!isModuleEnabled("crm")) return null
  const email = clip(ev.email, 320)?.toLowerCase() ?? null
  const name = clip(ev.name, 200)
  if (!email && !name) return null
  try {
    let contactId: string | null = null
    if (email) {
      const existing = await db
        .selectFrom("crm_contacts")
        .select(["id", "name", "company", "phone", "user_id"])
        .where("email", "=", email)
        .executeTakeFirst()
      if (existing) {
        contactId = existing.id
        await db
          .updateTable("crm_contacts")
          .set({
            name: existing.name ?? name,
            company: existing.company ?? clip(ev.company, 200),
            phone: existing.phone ?? clip(ev.phone, 60),
            user_id: existing.user_id ?? ev.userId ?? null,
            last_activity_at: nowIso(),
          })
          .where("id", "=", existing.id)
          .execute()
      }
    }
    if (!contactId) {
      const id = crypto.randomUUID()
      try {
        await db
          .insertInto("crm_contacts")
          .values({
            id,
            email,
            name,
            company: clip(ev.company, 200),
            phone: clip(ev.phone, 60),
            user_id: ev.userId ?? null,
            source: ev.source.slice(0, 40),
          })
          .execute()
        contactId = id
      } catch (e) {
        // Lost a race with a concurrent insert for the same email: read it back
        if (!(isUniqueViolation(e) && email)) throw e
        const again = await db
          .selectFrom("crm_contacts")
          .select("id")
          .where("email", "=", email)
          .executeTakeFirst()
        contactId = again?.id ?? null
      }
    }
    if (!contactId) return null
    await db
      .insertInto("crm_activities")
      .values({
        contact_id: contactId,
        kind: ev.kind,
        body: clip(ev.body, 5000),
        ref_type: ev.ref?.type ?? null,
        ref_id: ev.ref?.id ?? null,
      })
      .execute()
    return contactId
  } catch (e) {
    console.error(
      "captureLead failed",
      ev.kind,
      e instanceof Error ? e.message : e,
    )
    return null
  }
}
