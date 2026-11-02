import { requirePermission } from "$lib/server/auth/staff"
import { isModuleEnabled } from "$lib/modules"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  const staff = await requirePermission(event, "admin.access")
  const db = event.locals.supabaseServiceRole
  const p = staff.permissions
  const can = (
    perm: Parameters<typeof p.has>[0],
    mod?: Parameters<typeof isModuleEnabled>[0],
  ) => p.has(perm) && (!mod || isModuleEnabled(mod))
  const head = { count: "exact" as const, head: true }
  const nowIso = new Date().toISOString()

  const [
    users,
    activeSubs,
    newContacts,
    openChats,
    upcoming,
    pages,
    recentChats,
    recentContacts,
    upcomingList,
  ] = await Promise.all([
    can("users.view") ? db.rpc("admin_list_users", { p_limit: 1 }) : null,
    can("billing.view", "subscriptions")
      ? db
          .from("subscriptions")
          .select("id", head)
          .in("status", ["active", "trialing"])
      : null,
    can("contact.manage", "contact")
      ? db.from("contact_requests").select("id", head).eq("status", "new")
      : null,
    can("chat.respond", "chat")
      ? db.from("chat_conversations").select("id", head).neq("status", "closed")
      : null,
    can("bookings.view", "booking")
      ? db
          .from("bookings")
          .select("id", head)
          .eq("status", "scheduled")
          .gte("start_time", nowIso)
      : null,
    can("cms.edit", "cms")
      ? db.from("cms_pages").select("id", head).eq("status", "published")
      : null,
    can("chat.respond", "chat")
      ? db
          .from("chat_conversations")
          .select(
            "id, visitor_name, visitor_email, status, unread_by_staff, last_message_at",
          )
          .neq("status", "closed")
          .order("last_message_at", { ascending: false })
          .limit(5)
      : null,
    can("contact.manage", "contact")
      ? db
          .from("contact_requests")
          .select("id, first_name, last_name, email, status, created_at")
          .order("created_at", { ascending: false })
          .limit(5)
      : null,
    can("bookings.view", "booking")
      ? db
          .from("bookings")
          .select("id, invitee_name, invitee_email, event_name, start_time")
          .eq("status", "scheduled")
          .gte("start_time", nowIso)
          .order("start_time", { ascending: true })
          .limit(5)
      : null,
  ])

  const stats = [
    users && {
      label: "Users",
      value: users.data?.[0]?.total_count ?? 0,
      href: "/admin/users",
    },
    activeSubs && {
      label: "Active subscriptions",
      value: activeSubs.count ?? 0,
      href: "/admin/subscriptions",
    },
    newContacts && {
      label: "New contact requests",
      value: newContacts.count ?? 0,
      href: "/admin/contact",
    },
    openChats && {
      label: "Open chats",
      value: openChats.count ?? 0,
      href: "/admin/support",
    },
    upcoming && {
      label: "Upcoming bookings",
      value: upcoming.count ?? 0,
      href: "/admin/bookings",
    },
    pages && {
      label: "Published pages",
      value: pages.count ?? 0,
      href: "/admin/pages",
    },
  ].filter(Boolean) as { label: string; value: number; href: string }[]

  return {
    stats,
    recentChats: recentChats?.data ?? null,
    recentContacts: recentContacts?.data ?? null,
    upcomingBookings: upcomingList?.data ?? null,
  }
}
