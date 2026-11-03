import { requirePermission } from "$lib/server/auth/staff"
import { adminNavFor, isModuleEnabled } from "$lib/modules"
import { getSettings } from "$lib/server/settings"
import type { LayoutServerLoad } from "./$types"

export const load: LayoutServerLoad = async (event) => {
  const staff = await requirePermission(event, "admin.access")
  const db = event.locals.supabaseServiceRole
  const p = staff.permissions

  // Sidebar badges: head-only counts, run in parallel.
  const [contacts, chats] = await Promise.all([
    isModuleEnabled("contact") && p.has("contact.manage")
      ? db
          .from("contact_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "new")
      : null,
    isModuleEnabled("chat") && p.has("chat.respond")
      ? db
          .from("chat_conversations")
          .select("id", { count: "exact", head: true })
          .neq("status", "closed")
          .gt("unread_by_staff", 0)
      : null,
  ])

  return {
    siteName: (await getSettings(db)).brand.siteName,
    staff: { email: staff.email, roles: staff.roles },
    permissions: [...p],
    nav: adminNavFor(p),
    badges: {
      "/admin/contact": contacts?.count ?? 0,
      "/admin/support": chats?.count ?? 0,
    } as Record<string, number>,
  }
}
