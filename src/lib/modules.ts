// Module registry shared by server and client code.
// Each module declares the admin pages it contributes and the permission each
// one needs, so the admin navigation and route guards stay in one place.
import { EnabledModules } from "../config"
import type { Permission } from "./permissions"

export type ModuleId = keyof typeof EnabledModules

export type AdminNavItem = {
  href: string
  label: string
  permission: Permission
  icon: string // SVG path data (24x24, stroke)
  module?: ModuleId
}

export const isModuleEnabled = (id: ModuleId): boolean =>
  EnabledModules[id] === true

const ICONS = {
  dashboard: "M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10",
  users:
    "M17 20h5v-2a4 4 0 00-5-3.9M17 20H7m10 0v-2c0-.7-.1-1.3-.4-1.9M7 20H2v-2a4 4 0 015-3.9M7 20v-2c0-.7.1-1.3.4-1.9m0 0a5 5 0 019.2 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  card: "M3 10h18M7 15h2m4 0h4M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  pages:
    "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.6a1 1 0 01.7.3l5.4 5.4a1 1 0 01.3.7V19a2 2 0 01-2 2z",
  inbox:
    "M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.6a1 1 0 00-.7.3l-2.4 2.4a1 1 0 01-.7.3h-3.2a1 1 0 01-.7-.3l-2.4-2.4a1 1 0 00-.7-.3H4",
  chat: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z",
  calendar:
    "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  audit:
    "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  settings:
    "M10.3 4.3c.4-1.7 3-1.7 3.4 0a1.7 1.7 0 002.6 1.1c1.5-.9 3.3.8 2.4 2.4a1.7 1.7 0 001 2.5c1.8.4 1.8 3 0 3.4a1.7 1.7 0 00-1 2.6c.9 1.5-.9 3.3-2.4 2.4a1.7 1.7 0 00-2.6 1c-.4 1.8-3 1.8-3.4 0a1.7 1.7 0 00-2.6-1c-1.5.9-3.3-.9-2.4-2.4a1.7 1.7 0 00-1-2.6c-1.8-.4-1.8-3 0-3.4a1.7 1.7 0 001-2.6c-.9-1.5.9-3.3 2.4-2.4 1 .6 2.3.1 2.6-1zM15 12a3 3 0 11-6 0 3 3 0 016 0z",
}

const ALL_ADMIN_NAV: AdminNavItem[] = [
  {
    href: "/admin",
    label: "Dashboard",
    permission: "admin.access",
    icon: ICONS.dashboard,
  },
  {
    href: "/admin/users",
    label: "Users",
    permission: "users.view",
    icon: ICONS.users,
  },
  {
    href: "/admin/subscriptions",
    label: "Subscriptions",
    permission: "billing.view",
    icon: ICONS.card,
    module: "subscriptions",
  },
  {
    href: "/admin/pages",
    label: "Pages",
    permission: "cms.edit",
    icon: ICONS.pages,
    module: "cms",
  },
  {
    href: "/admin/contact",
    label: "Contact inbox",
    permission: "contact.manage",
    icon: ICONS.inbox,
    module: "contact",
  },
  {
    href: "/admin/support",
    label: "Live chat",
    permission: "chat.respond",
    icon: ICONS.chat,
    module: "chat",
  },
  {
    href: "/admin/bookings",
    label: "Bookings",
    permission: "bookings.view",
    icon: ICONS.calendar,
    module: "booking",
  },
  {
    href: "/admin/audit",
    label: "Audit log",
    permission: "audit.view",
    icon: ICONS.audit,
  },
  {
    href: "/admin/settings",
    label: "Settings",
    permission: "settings.manage",
    icon: ICONS.settings,
  },
]

export const adminNavFor = (permissions: ReadonlySet<Permission>) =>
  ALL_ADMIN_NAV.filter(
    (item) =>
      permissions.has(item.permission) &&
      (!item.module || isModuleEnabled(item.module)),
  )
