// Role -> permission mapping. Pure and shared, so the UI can hide what the
// server would refuse anyway. The server is always the enforcement point.
import type { AppRole } from "./server/db/schema"

export const PERMISSIONS = [
  "admin.access",
  "users.view",
  "users.manage_roles",
  "billing.view",
  "cms.write",
  "cms.edit",
  "cms.publish",
  "cms.publish_own",
  "comments.moderate",
  "plugins.manage",
  "contact.manage",
  "chat.respond",
  "bookings.view",
  "settings.manage",
  "audit.view",
  "crm.manage",
  "newsletter.manage",
  "analytics.view",
  "helpdesk.work",
  "helpdesk.configure",
  "forms.manage",
  "campaigns.manage",
  "projects.manage",
  "team.manage",
  "team.self",
  "expenses.manage",
  "expenses.submit",
  "translations.manage",
  "reports.view",
  "assistant.manage",
] as const
export type Permission = (typeof PERMISSIONS)[number]

export const ROLES: readonly AppRole[] = [
  "admin",
  "editor",
  "author",
  "contributor",
  "support",
]

const ROLE_PERMISSIONS: Record<AppRole, readonly Permission[]> = {
  admin: PERMISSIONS,
  editor: [
    "admin.access",
    "cms.write",
    "cms.edit",
    "cms.publish",
    "comments.moderate",
    "newsletter.manage",
    "analytics.view",
    "forms.manage",
    "campaigns.manage",
    "translations.manage",
    "team.self",
    "expenses.submit",
  ],
  author: ["admin.access", "cms.write", "cms.publish_own", "team.self"],
  contributor: ["admin.access", "cms.write", "team.self"],
  support: [
    "admin.access",
    "users.view",
    "contact.manage",
    "chat.respond",
    "bookings.view",
    "crm.manage",
    "helpdesk.work",
    "projects.manage",
    "team.self",
    "expenses.submit",
  ],
}

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  admin: "Full access, including roles, billing and settings",
  editor:
    "Manage all website content, comments, translations, forms, campaigns and analytics",
  author: "Write pages and posts and publish their own",
  contributor: "Write drafts and send them to an editor for review",
  support:
    "Work tickets, chats and contact requests, manage CRM and projects, view bookings and users",
}

export const permissionsFor = (
  roles: readonly AppRole[],
): ReadonlySet<Permission> => {
  const set = new Set<Permission>()
  for (const role of roles) {
    for (const p of ROLE_PERMISSIONS[role] ?? []) set.add(p)
  }
  return set
}

export const isAppRole = (value: unknown): value is AppRole =>
  typeof value === "string" && (ROLES as readonly string[]).includes(value)
