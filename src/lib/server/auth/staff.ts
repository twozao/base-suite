import { error, redirect, type RequestEvent } from "@sveltejs/kit"
import type { AppRole } from "../../../DatabaseDefinitions"
import { permissionsFor, type Permission } from "$lib/permissions"
import { isModuleEnabled, type ModuleId } from "$lib/modules"

export type StaffContext = {
  userId: string
  email: string | undefined
  roles: AppRole[]
  permissions: ReadonlySet<Permission>
}

/**
 * Loads the current user's roles once per request (memoised on locals).
 * Uses the service role and the *validated* user from safeGetSession, so a
 * forged cookie cannot claim a role.
 */
export const getStaff = async (
  event: Pick<RequestEvent, "locals">,
): Promise<StaffContext | null> => {
  const { locals } = event
  if (locals.staff !== undefined) return locals.staff
  const user = locals.user
  if (!user) {
    locals.staff = null
    return null
  }
  const { data, error: dbError } = await locals.supabaseServiceRole
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
  if (dbError) {
    console.error("Failed to load roles", dbError.message)
    // Fail closed: no roles means no admin access.
    locals.staff = null
    return null
  }
  const roles = (data ?? []).map((r) => r.role)
  locals.staff = roles.length
    ? {
        userId: user.id,
        email: user.email,
        roles,
        permissions: permissionsFor(roles),
      }
    : null
  return locals.staff
}

/**
 * Guard for admin loads and actions. Signed-out users are sent to login;
 * signed-in users without the permission get a 404, so the admin surface is
 * not advertised to them.
 */
export const requirePermission = async (
  event: Pick<RequestEvent, "locals" | "url">,
  permission: Permission,
): Promise<StaffContext> => {
  if (!event.locals.user) {
    redirect(
      303,
      `/login/sign_in?next=${encodeURIComponent(event.url.pathname)}`,
    )
  }
  const staff = await getStaff(event)
  if (!staff || !staff.permissions.has("admin.access")) {
    error(404, "Not found")
  }
  if (!staff.permissions.has(permission)) {
    error(403, "You don't have permission to do that")
  }
  return staff
}

export const requireModule = (id: ModuleId) => {
  if (!isModuleEnabled(id)) error(404, "Not found")
}
