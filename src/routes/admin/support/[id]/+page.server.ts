import { error, fail } from "@sveltejs/kit"
import { z } from "zod"
import { isUuid } from "$lib/server/ids"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { addMessage, listMessages } from "$lib/server/chat/service"
import { audit } from "$lib/server/audit"
import type { Actions, PageServerLoad, RequestEvent } from "./$types"

const replySchema = z.object({
  body: z.string().trim().min(1, "Reply is empty").max(4000),
})

const guard = async (event: RequestEvent) => {
  requireModule("chat")
  const staff = await requirePermission(event, "chat.respond")
  if (!isUuid(event.params.id)) error(404, "Not found")
  return staff
}

export const load: PageServerLoad = async (event) => {
  await guard(event)
  event.depends("admin:chat")
  const db = event.locals.db
  const conversation = await db
    .selectFrom("chat_conversations")
    .select([
      "id",
      "user_id",
      "visitor_name",
      "visitor_email",
      "page_url",
      "status",
      "assigned_to",
      "created_at",
      "unread_by_staff",
    ])
    .where("id", "=", event.params.id)
    .executeTakeFirst()
  if (!conversation) error(404, "Conversation not found")

  const messages = await listMessages(event, conversation.id)
  if (conversation.unread_by_staff > 0) {
    await db
      .updateTable("chat_conversations")
      .set({ unread_by_staff: 0 })
      .where("id", "=", conversation.id)
      .execute()
  }
  return { conversation, messages, me: event.locals.user!.id }
}

export const actions: Actions = {
  reply: async (event) => {
    const staff = await guard(event)
    const form = await event.request.formData()
    const parsed = replySchema.safeParse({ body: form.get("body") })
    if (!parsed.success)
      return fail(400, { error: parsed.error.issues[0].message })
    const db = event.locals.db
    const c = await db
      .selectFrom("chat_conversations")
      .select(["id", "assigned_to", "status"])
      .where("id", "=", event.params.id)
      .executeTakeFirst()
    if (!c) error(404, "Not found")
    await addMessage(event, c.id, "staff", parsed.data.body)
    // Replying claims an unassigned conversation and marks it pending (waiting on visitor)
    await db
      .updateTable("chat_conversations")
      .set({ status: "pending", assigned_to: c.assigned_to ?? staff.userId })
      .where("id", "=", c.id)
      .execute()
    return { sent: true }
  },
  setStatus: async (event) => {
    await guard(event)
    const form = await event.request.formData()
    const status = z
      .enum(["open", "pending", "closed"])
      .safeParse(form.get("status"))
    if (!status.success) return fail(400, { error: "Invalid status" })
    await event.locals.db
      .updateTable("chat_conversations")
      .set({ status: status.data })
      .where("id", "=", event.params.id)
      .execute()
    await audit(
      event,
      "chat.status_changed",
      { type: "chat", id: event.params.id },
      { status: status.data },
    )
    return { message: `Marked ${status.data}` }
  },
  assignToMe: async (event) => {
    const staff = await guard(event)
    await event.locals.db
      .updateTable("chat_conversations")
      .set({ assigned_to: staff.userId })
      .where("id", "=", event.params.id)
      .execute()
    return { message: "Assigned to you" }
  },
}
