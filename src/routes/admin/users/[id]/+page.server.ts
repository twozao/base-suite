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
  const db = event.locals.db

  const user = await db
    .selectFrom("users")
    .select(["id", "email", "email_verified", "created_at", "last_sign_in_at"])
    .where("id", "=", id)
    .executeTakeFirst()
  if (!user) error(404, "User not found")
  const email = user.email.toLowerCase()
  const p = staff.permissions

  const [profile, roles, subs, chats, contacts, bookings] = await Promise.all([
    db
      .selectFrom("profiles")
      .select(["full_name", "company_name", "website", "unsubscribed"])
      .where("id", "=", id)
      .executeTakeFirst(),
    db
      .selectFrom("user_roles")
      .select(["role", "created_at"])
      .where("user_id", "=", id)
      .execute(),
    p.has("billing.view") && isModuleEnabled("subscriptions")
      ? db
          .selectFrom("subscriptions")
          .select([
            "id",
            "status",
            "product_id",
            "current_period_end",
            "cancel_at_period_end",
          ])
          .where("user_id", "=", id)
          .orderBy("updated_at", "desc")
          .execute()
      : null,
    p.has("chat.respond") && isModuleEnabled("chat")
      ? db
          .selectFrom("chat_conversations")
          .select(["id", "status", "last_message_at"])
          .where("user_id", "=", id)
          .orderBy("last_message_at", "desc")
          .limit(10)
          .execute()
      : null,
    p.has("contact.manage") && isModuleEnabled("contact")
      ? db
          .selectFrom("contact_requests")
          .select(["id", "status", "created_at", "message_body"])
          .where("email", "=", email)
          .orderBy("created_at", "desc")
          .limit(10)
          .execute()
      : null,
    p.has("bookings.view") && isModuleEnabled("booking")
      ? db
          .selectFrom("bookings")
          .select(["id", "event_name", "start_time", "status"])
          .where((eb) =>
            eb.or([eb("user_id", "=", id), eb("invitee_email", "=", email)]),
          )
          .orderBy("start_time", "desc")
          .limit(10)
          .execute()
      : null,
  ])

  return {
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at,
      confirmed: user.email_verified === 1,
    },
    profile: profile ?? null,
    roles: roles.map((r) => r.role),
    allRoles: ROLES.map((r) => ({
      role: r,
      description: ROLE_DESCRIPTIONS[r],
    })),
    canManageRoles: p.has("users.manage_roles"),
    isSelf: id === staff.userId,
    subscriptions: subs,
    chats,
    contacts,
    bookings,
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

    const db = event.locals.db
    const current = await db
      .selectFrom("user_roles")
      .select("role")
      .where("user_id", "=", id)
      .execute()
    const have = new Set(current.map((r) => r.role))
    const add = wanted.filter((r) => !have.has(r))
    const remove = [...have].filter((r) => !wanted.includes(r))

    try {
      await db.transaction().execute(async (trx) => {
        if (add.length) {
          await trx
            .insertInto("user_roles")
            .values(
              add.map((role) => ({
                user_id: id,
                role,
                granted_by: staff.userId,
              })),
            )
            .onConflict((oc) => oc.columns(["user_id", "role"]).doNothing())
            .execute()
        }
        if (remove.length) {
          await trx
            .deleteFrom("user_roles")
            .where("user_id", "=", id)
            .where("role", "in", remove)
            .execute()
        }
      })
    } catch (e) {
      console.error("roles update failed", e instanceof Error ? e.message : e)
      return fail(500, { error: "Could not update roles" })
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
