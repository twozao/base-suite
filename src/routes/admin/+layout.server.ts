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
  const [contacts, chats] = await Promise.all([
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
  ])

  return {
    siteName: (await getSettings(db)).brand.siteName,
    staff: { email: staff.email, roles: staff.roles },
    permissions: [...p],
    nav: adminNavFor(p),
    badges: {
      "/admin/contact": Number(contacts?.n ?? 0),
      "/admin/support": Number(chats?.n ?? 0),
    } as Record<string, number>,
  }
}
