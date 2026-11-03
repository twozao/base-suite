import type { RequestEvent } from "@sveltejs/kit"
import type { Json } from "../../DatabaseDefinitions"
import { clientIp } from "./security/request"

// Every action the admin portal records. The audit page filters on these exact strings, so a
// new action is added here first and the compiler catches typos at the call site.
export const AUDIT_ACTIONS = [
  "chat.status_changed",
  "contact.updated",
  "crm.contact_created",
  "crm.contact_deleted",
  "crm.contact_updated",
  "media.deleted",
  "media.uploaded",
  "module.disabled",
  "module.enabled",
  "newsletter.exported",
  "newsletter.subscriber_deleted",
  "page.archived",
  "page.created",
  "page.deleted",
  "page.published",
  "page.revision_restored",
  "page.saved",
  "post.created",
  "post.deleted",
  "post.published",
  "post.saved",
  "settings.updated",
  "user.roles_changed",
] as const
export type AuditAction = (typeof AUDIT_ACTIONS)[number]

export const isAuditAction = (value: unknown): value is AuditAction =>
  typeof value === "string" &&
  (AUDIT_ACTIONS as readonly string[]).includes(value)

/**
 * Append an entry to the audit log. Never throws: an audit failure is logged
 * but does not undo the action that already happened.
 */
export const audit = async (
  event: RequestEvent,
  action: AuditAction,
  target?: { type: string; id: string },
  meta: Record<string, Json | undefined> = {},
) => {
  const { error } = await event.locals.supabaseServiceRole
    .from("audit_log")
    .insert({
      actor_id: event.locals.user?.id ?? null,
      action,
      target_type: target?.type ?? null,
      target_id: target?.id ?? null,
      meta: meta as Json,
      ip: clientIp(event),
    })
  if (error) console.error("audit insert failed", action, error.message)
}
