import { redirect } from "@sveltejs/kit"
import { CreateProfileStep } from "../../../config"
import { hasFullProfile } from "$lib/profile"
import { getStaff } from "$lib/server/auth/staff"
import type { LayoutServerLoad } from "./$types"

const createProfilePath = "/account/create_profile"
const signOutPath = "/account/sign_out"

// Every portal page needs a signed-in user; the hook already validated the session cookie.
export const load: LayoutServerLoad = async (event) => {
  const user = event.locals.user
  if (!user) redirect(303, "/login")
  const row = await event.locals.db
    .selectFrom("profiles")
    .selectAll()
    .where("id", "=", user.id)
    .executeTakeFirst()
  const profile = row ? { ...row, unsubscribed: row.unsubscribed === 1 } : null
  const staff = await getStaff(event)
  const path = event.url.pathname
  if (
    CreateProfileStep &&
    !hasFullProfile(profile) &&
    path !== createProfilePath &&
    path !== signOutPath
  ) {
    redirect(303, createProfilePath)
  }
  return { user, profile, isStaff: !!staff }
}
