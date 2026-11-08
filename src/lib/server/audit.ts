import type { RequestEvent } from "@sveltejs/kit"
import type { Json } from "./db/schema"
import { clientIp } from "./security/request"

// Every action the admin portal records. The audit page filters on these exact strings, so a
// new action is added here first and the compiler catches typos at the call site.
export const AUDIT_ACTIONS = [
  "auth.oauth_secret_changed",
  "assistant.changed",
  "booking.canceled",
  "booking.event_type_deleted",
  "booking.event_type_saved",
  "booking.updated",
  "campaign.sent",
  "chat.status_changed",
  "expense.decided",
  "form.deleted",
  "form.saved",
  "helpdesk.ticket_updated",
  "kb.article_deleted",
  "kb.article_saved",
  "leave.decided",
  "project.deleted",
  "project.saved",
  "team.member_saved",
  "translation.saved",
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
  "app.deleted",
  "app.saved",
  "auth.2fa_disabled",
  "auth.2fa_enabled",
  "auth.passkey_added",
  "auth.passkey_removed",
  "auth.recovery_codes_created",
  "auth.sessions_revoked",
  "backup.exported",
  "backup.restored",
  "block.deleted",
  "block.saved",
  "comment.moderated",
  "content_type.deleted",
  "content_type.saved",
  "entry.created",
  "entry.deleted",
  "entry.published",
  "entry.review_requested",
  "entry.saved",
  "extension.installed",
  "extension.toggled",
  "extension.uninstalled",
  "import.wordpress",
  "media.imported",
  "media.updated",
  "page.review_requested",
  "post.review_requested",
  "redirect.deleted",
  "redirect.saved",
  "token.created",
  "token.revoked",
  "webhook.deleted",
  "webhook.saved",
] as const
export type AuditAction = (typeof AUDIT_ACTIONS)[number]

export const isAuditAction = (value: unknown): value is AuditAction =>
  typeof value === "string" &&
  (AUDIT_ACTIONS as readonly string[]).includes(value)

/** Append an entry to the audit log. Never throws: an audit failure is logged but does not undo the action. */
export const audit = async (
  event: RequestEvent,
  action: AuditAction,
  target?: { type: string; id: string },
  meta: Record<string, Json | undefined> = {},
) => {
  try {
    await event.locals.db
      .insertInto("audit_log")
      .values({
        actor_id: event.locals.user?.id ?? null,
        action,
        target_type: target?.type ?? null,
        target_id: target?.id ?? null,
        meta: JSON.stringify(meta),
        ip: clientIp(event),
      })
      .execute()
  } catch (e) {
    console.error(
      "audit insert failed",
      action,
      e instanceof Error ? e.message : e,
    )
  }
}
