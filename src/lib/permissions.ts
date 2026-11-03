// Role -> permission mapping. Pure and shared, so the UI can hide what the
// server would refuse anyway. The server is always the enforcement point.
import type { AppRole } from "../DatabaseDefinitions"

export const PERMISSIONS = [
  "admin.access",
  "users.view",
  "users.manage_roles",
  "billing.view",
  "cms.edit",
  "cms.publish",
  "contact.manage",
  "chat.respond",
  "bookings.view",
  "settings.manage",
  "audit.view",
  "crm.manage",
  "newsletter.manage",
  "analytics.view",
] as const
export type Permission = (typeof PERMISSIONS)[number]

export const ROLES: readonly AppRole[] = ["admin", "editor", "support"]

const ROLE_PERMISSIONS: Record<AppRole, readonly Permission[]> = {
  admin: PERMISSIONS,
  editor: [
    "admin.access",
    "cms.edit",
    "cms.publish",
    "newsletter.manage",
    "analytics.view",
  ],
  support: [
    "admin.access",
    "users.view",
    "contact.manage",
    "chat.respond",
    "bookings.view",
    "crm.manage",
  ],
}

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  admin: "Full access, including roles, billing and settings",
  editor: "Manage website content, newsletter and analytics",
  support:
    "Answer chats and contact requests, manage CRM, view bookings and users",
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
