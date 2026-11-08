import { requirePermission } from "$lib/server/auth/staff"
import { adminNavFor, isModuleEnabled } from "$lib/modules"
import { getSettings } from "$lib/server/settings"
import type { LayoutServerLoad } from "./$types"

export const load: LayoutServerLoad = async (event) => {
  const staff = await requirePermission(event, "admin.access")
  const db = event.locals.db
  const p = staff.permissions
  const count = db.fn.countAll<number>().as("n")

  // Sidebar badges: count-only queries, run in parallel.
  const [contacts, chats, tickets, leave, expenses] = await Promise.all([
    isModuleEnabled("contact") && p.has("contact.manage")
      ? db
          .selectFrom("contact_requests")
          .select(count)
          .where("status", "=", "new")
          .executeTakeFirstOrThrow()
      : null,
    isModuleEnabled("chat") && p.has("chat.respond")
      ? db
          .selectFrom("chat_conversations")
          .select(count)
          .where("status", "!=", "closed")
          .where("unread_by_staff", ">", 0)
          .executeTakeFirstOrThrow()
      : null,
    isModuleEnabled("helpdesk") && p.has("helpdesk.work")
      ? db
          .selectFrom("helpdesk_tickets")
          .select(count)
          .where("status", "=", "open")
          .executeTakeFirstOrThrow()
      : null,
    isModuleEnabled("team") && p.has("team.manage")
      ? db
          .selectFrom("leave_requests")
          .select(count)
          .where("status", "=", "pending")
          .executeTakeFirstOrThrow()
      : null,
    isModuleEnabled("expenses") && p.has("expenses.manage")
      ? db
          .selectFrom("expenses")
          .select(count)
          .where("status", "=", "submitted")
          .executeTakeFirstOrThrow()
      : null,
  ])

  return {
    siteName: (await getSettings(db)).brand.siteName,
    staff: { email: staff.email, roles: staff.roles },
    permissions: [...p],
    nav: adminNavFor(p),
    badges: {
      "/admin/contact": Number(contacts?.n ?? 0),
      "/admin/support": Number(chats?.n ?? 0),
      "/admin/helpdesk": Number(tickets?.n ?? 0),
      "/admin/team": Number(leave?.n ?? 0),
      "/admin/expenses": Number(expenses?.n ?? 0),
    } as Record<string, number>,
  }
}
