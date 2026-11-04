import { requirePermission } from "$lib/server/auth/staff"
import { countUsers } from "$lib/server/auth/directory"
import { nowIso } from "$lib/server/db/json"
import { isModuleEnabled } from "$lib/modules"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  const staff = await requirePermission(event, "admin.access")
  const db = event.locals.db
  const p = staff.permissions
  const can = (
    perm: Parameters<typeof p.has>[0],
    mod?: Parameters<typeof isModuleEnabled>[0],
  ) => p.has(perm) && (!mod || isModuleEnabled(mod))
  const count = db.fn.countAll<number>().as("n")
  const now = nowIso()

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
    can("users.view") ? countUsers(db) : null,
    can("billing.view", "subscriptions")
      ? db
          .selectFrom("subscriptions")
          .select(count)
          .where("status", "in", ["active", "trialing"])
          .executeTakeFirstOrThrow()
      : null,
    can("contact.manage", "contact")
      ? db
          .selectFrom("contact_requests")
          .select(count)
          .where("status", "=", "new")
          .executeTakeFirstOrThrow()
      : null,
    can("chat.respond", "chat")
      ? db
          .selectFrom("chat_conversations")
          .select(count)
          .where("status", "!=", "closed")
          .executeTakeFirstOrThrow()
      : null,
    can("bookings.view", "booking")
      ? db
          .selectFrom("bookings")
          .select(count)
          .where("status", "=", "scheduled")
          .where("start_time", ">=", now)
          .executeTakeFirstOrThrow()
      : null,
    can("cms.edit", "cms")
      ? db
          .selectFrom("cms_pages")
          .select(count)
          .where("status", "=", "published")
          .executeTakeFirstOrThrow()
      : null,
    can("chat.respond", "chat")
      ? db
          .selectFrom("chat_conversations")
          .select([
            "id",
            "visitor_name",
            "visitor_email",
            "status",
            "unread_by_staff",
            "last_message_at",
          ])
          .where("status", "!=", "closed")
          .orderBy("last_message_at", "desc")
          .limit(5)
          .execute()
      : null,
    can("contact.manage", "contact")
      ? db
          .selectFrom("contact_requests")
          .select([
            "id",
            "first_name",
            "last_name",
            "email",
            "status",
            "created_at",
          ])
          .orderBy("created_at", "desc")
          .limit(5)
          .execute()
      : null,
    can("bookings.view", "booking")
      ? db
          .selectFrom("bookings")
          .select([
            "id",
            "invitee_name",
            "invitee_email",
            "event_name",
            "start_time",
          ])
          .where("status", "=", "scheduled")
          .where("start_time", ">=", now)
          .orderBy("start_time", "asc")
          .limit(5)
          .execute()
      : null,
  ])

  const weekAgoDay = new Date(Date.now() - 6 * 86400e3)
    .toISOString()
    .slice(0, 10)
  const [views, leads, subscribers] = await Promise.all([
    can("analytics.view", "analytics")
      ? db
          .selectFrom("analytics_daily")
          .select(db.fn.sum<number | null>("views").as("n"))
          .where("day", ">=", weekAgoDay)
          .executeTakeFirstOrThrow()
      : null,
    can("crm.manage", "crm")
      ? db
          .selectFrom("crm_contacts")
          .select(count)
          .where("status", "=", "lead")
          .executeTakeFirstOrThrow()
      : null,
    can("newsletter.manage", "newsletter")
      ? db
          .selectFrom("newsletter_subscribers")
          .select(count)
          .where("status", "=", "confirmed")
          .executeTakeFirstOrThrow()
      : null,
  ])

  const stats = [
    views && {
      label: "Page views (7 days)",
      value: Number(views.n ?? 0),
      href: "/admin/analytics",
    },
    leads && {
      label: "Open leads",
      value: Number(leads.n),
      href: "/admin/crm",
    },
    subscribers && {
      label: "Newsletter subscribers",
      value: Number(subscribers.n),
      href: "/admin/newsletter",
    },
    users !== null && {
      label: "Users",
      value: users,
      href: "/admin/users",
    },
    activeSubs && {
      label: "Active subscriptions",
      value: Number(activeSubs.n),
      href: "/admin/subscriptions",
    },
    newContacts && {
      label: "New contact requests",
      value: Number(newContacts.n),
      href: "/admin/contact",
    },
    openChats && {
      label: "Open chats",
      value: Number(openChats.n),
      href: "/admin/support",
    },
    upcoming && {
      label: "Upcoming bookings",
      value: Number(upcoming.n),
      href: "/admin/bookings",
    },
    pages && {
      label: "Published pages",
      value: Number(pages.n),
      href: "/admin/pages",
    },
  ].filter(Boolean) as { label: string; value: number; href: string }[]

  return {
    stats,
    recentChats,
    recentContacts,
    upcomingBookings: upcomingList,
  }
}
