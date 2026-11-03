import type { SupabaseClient } from "@supabase/supabase-js"
import type { CrmActivityKind, Database } from "../../DatabaseDefinitions"
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
 * Record a customer touchpoint in the CRM: finds or creates the contact by
 * email and appends an activity. Called from other modules (contact form,
 * chat, bookings, newsletter, billing). No-op when the CRM module is off.
 * Never throws — a CRM hiccup must not break the feature that called it.
 */
export const captureLead = async (
  db: SupabaseClient<Database>,
  ev: LeadEvent,
) => {
  if (!isModuleEnabled("crm")) return null
  const email = clip(ev.email, 320)?.toLowerCase() ?? null
  const name = clip(ev.name, 200)
  if (!email && !name) return null
  try {
    let contactId: string | null = null
    if (email) {
      const { data: existing } = await db
        .from("crm_contacts")
        .select("id, name, company, phone, user_id")
        .eq("email", email)
        .maybeSingle()
      if (existing) {
        contactId = existing.id
        await db
          .from("crm_contacts")
          .update({
            name: existing.name ?? name,
            company: existing.company ?? clip(ev.company, 200),
            phone: existing.phone ?? clip(ev.phone, 60),
            user_id: existing.user_id ?? ev.userId ?? null,
            last_activity_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
      }
    }
    if (!contactId) {
      const { data, error } = await db
        .from("crm_contacts")
        .insert({
          email,
          name,
          company: clip(ev.company, 200),
          phone: clip(ev.phone, 60),
          user_id: ev.userId ?? null,
          source: ev.source.slice(0, 40),
        })
        .select("id")
        .single()
      if (error) {
        // Lost a race with a concurrent insert for the same email: retry read
        if (error.code === "23505" && email) {
          const { data: again } = await db
            .from("crm_contacts")
            .select("id")
            .eq("email", email)
            .single()
          contactId = again?.id ?? null
        } else throw error
      } else contactId = data.id
    }
    if (!contactId) return null
    await db.from("crm_activities").insert({
      contact_id: contactId,
      kind: ev.kind,
      body: clip(ev.body, 5000),
      ref_type: ev.ref?.type ?? null,
      ref_id: ev.ref?.id ?? null,
    })
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
