import { error, fail } from "@sveltejs/kit"
import { isUuid } from "$lib/server/ids"
import { requirePermission } from "$lib/server/auth/staff"
import { audit } from "$lib/server/audit"
import { isAppRole, ROLES, ROLE_DESCRIPTIONS } from "$lib/permissions"
import { isModuleEnabled } from "$lib/modules"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  const staff = await requirePermission(event, "users.view")
  const id = event.params.id
  if (!isUuid(id)) error(404, "Not found")
  const db = event.locals.supabaseServiceRole

  const { data: authData, error: authError } =
    await db.auth.admin.getUserById(id)
  if (authError || !authData.user) error(404, "User not found")
  const user = authData.user
  const email = user.email?.toLowerCase() ?? ""
  const p = staff.permissions

  const [profile, roles, subs, chats, contacts, bookings] = await Promise.all([
    db
      .from("profiles")
      .select("full_name, company_name, website, unsubscribed")
      .eq("id", id)
      .maybeSingle(),
    db.from("user_roles").select("role, created_at").eq("user_id", id),
    p.has("billing.view") && isModuleEnabled("subscriptions")
      ? db
          .from("subscriptions")
          .select(
            "id, status, product_id, current_period_end, cancel_at_period_end",
          )
          .eq("user_id", id)
          .order("updated_at", { ascending: false })
      : null,
    p.has("chat.respond") && isModuleEnabled("chat")
      ? db
          .from("chat_conversations")
          .select("id, status, last_message_at")
          .eq("user_id", id)
          .order("last_message_at", { ascending: false })
          .limit(10)
      : null,
    p.has("contact.manage") && isModuleEnabled("contact") && email
      ? db
          .from("contact_requests")
          .select("id, status, created_at, message_body")
          .eq("email", email)
          .order("created_at", { ascending: false })
          .limit(10)
      : null,
    p.has("bookings.view") && isModuleEnabled("booking")
      ? db
          .from("bookings")
          .select("id, event_name, start_time, status")
          .or(
            `user_id.eq.${id},invitee_email.eq."${email.replace(/["\\]/g, "")}"`,
          )
          .order("start_time", { ascending: false })
          .limit(10)
      : null,
  ])

  return {
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at ?? null,
      confirmed: !!user.email_confirmed_at,
      providers: (user.app_metadata?.providers as string[] | undefined) ?? [],
    },
    profile: profile.data,
    roles: (roles.data ?? []).map((r) => r.role),
    allRoles: ROLES.map((r) => ({
      role: r,
      description: ROLE_DESCRIPTIONS[r],
    })),
    canManageRoles: p.has("users.manage_roles"),
    isSelf: id === staff.userId,
    subscriptions: subs?.data ?? null,
    chats: chats?.data ?? null,
    contacts: contacts?.data ?? null,
    bookings: bookings?.data ?? null,
  }
}

export const actions: Actions = {
  setRoles: async (event) => {
    const staff = await requirePermission(event, "users.manage_roles")
    const id = event.params.id
    if (!isUuid(id)) error(404, "Not found")
    const form = await event.request.formData()
    const wanted = [...new Set(form.getAll("roles").map(String))].filter(
      isAppRole,
    )

    if (id === staff.userId && !wanted.includes("admin")) {
      return fail(400, { error: "You can't remove your own admin role." })
    }

    const db = event.locals.supabaseServiceRole
    const { data: current } = await db
      .from("user_roles")
      .select("role")
      .eq("user_id", id)
    const have = new Set((current ?? []).map((r) => r.role))
    const add = wanted.filter((r) => !have.has(r))
    const remove = [...have].filter((r) => !wanted.includes(r))

    if (add.length) {
      const { error: e } = await db
        .from("user_roles")
        .insert(
          add.map((role) => ({ user_id: id, role, granted_by: staff.userId })),
        )
      if (e) return fail(500, { error: "Could not update roles" })
    }
    if (remove.length) {
      const { error: e } = await db
        .from("user_roles")
        .delete()
        .eq("user_id", id)
        .in("role", remove)
      if (e) return fail(500, { error: "Could not update roles" })
    }
    if (add.length || remove.length) {
      await audit(
        event,
        "user.roles_changed",
        { type: "user", id },
        { added: add, removed: remove },
      )
    }
    return { message: "Roles saved" }
  },
}
