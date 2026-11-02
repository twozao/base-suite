import type { RequestEvent } from "@sveltejs/kit"
import type { Json } from "../../DatabaseDefinitions"
import { clientIp } from "./security/request"

/**
 * Append an entry to the audit log. Never throws: an audit failure is logged
 * but does not undo the action that already happened.
 */
export const audit = async (
  event: RequestEvent,
  action: string,
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
