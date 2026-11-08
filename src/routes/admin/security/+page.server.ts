import { fail } from "@sveltejs/kit"
import { requirePermission } from "$lib/server/auth/staff"
import { accessConfigured } from "$lib/server/auth/access"
import { audit } from "$lib/server/audit"
import { getSettings, saveSetting } from "$lib/server/settings"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  await requirePermission(event, "settings.manage")
  const db = event.locals.db
  const staff = await db
    .selectFrom("user_roles as r")
    .innerJoin("users as u", "u.id", "r.user_id")
    .leftJoin("user_totp as t", "t.user_id", "u.id")
    .select(["u.id", "u.email", "t.enabled_at"])
    .select((eb) =>
      eb
        .selectFrom("user_passkeys as p")
        .select((x) => x.fn.countAll<number>().as("n"))
        .whereRef("p.user_id", "=", "u.id")
        .as("passkeys"),
    )
    .groupBy(["u.id", "u.email", "t.enabled_at"])
    .orderBy("u.email")
    .execute()
  return {
    security: (await getSettings(db)).security,
    access: accessConfigured(),
    staff: staff.map((s) => ({
      email: s.email,
      totp: !!s.enabled_at,
      passkeys: Number(s.passkeys ?? 0),
    })),
  }
}

export const actions: Actions = {
  default: async (event) => {
    const staff = await requirePermission(event, "settings.manage")
    const form = await event.request.formData()
    const requireStaff2fa = form.get("requireStaff2fa") === "on"
    if (requireStaff2fa) {
      const db = event.locals.db
      const mine = await db
        .selectFrom("user_totp")
        .select("enabled_at")
        .where("user_id", "=", staff.userId)
        .executeTakeFirst()
      const keys = await db
        .selectFrom("user_passkeys")
        .select("id")
        .where("user_id", "=", staff.userId)
        .executeTakeFirst()
      if (!mine?.enabled_at && !keys)
        return fail(400, {
          error:
            "Turn on two-step sign-in or add a passkey for your own account first, so you are not locked out.",
        })
    }
    await saveSetting(
      event.locals.db,
      "security",
      { requireStaff2fa },
      staff.userId,
    )
    await audit(event, "settings.updated", { type: "settings", id: "security" })
    return { message: "Saved" }
  },
}
