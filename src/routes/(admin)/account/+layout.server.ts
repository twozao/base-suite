import { redirect } from "@sveltejs/kit"
import { CreateProfileStep } from "../../../config"
import { hasFullProfile } from "$lib/profile"
import { isModuleEnabled } from "$lib/modules"
import { getStaff } from "$lib/server/auth/staff"
import { shouldAskForPlan } from "$lib/server/pricing"
import { getSettings } from "$lib/server/settings"
import { linkedProviders } from "$lib/server/auth/oauth_accounts"
import { signinPolicy } from "$lib/server/auth/signin"
import { hasPassword } from "$lib/server/auth/users"
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
  const [passwordSet, linked, policy] = await Promise.all([
    hasPassword(event.locals.db, user.id),
    linkedProviders(event.locals.db, user.id),
    signinPolicy(event.locals.db),
  ])
  const { pricing } = await getSettings(event.locals.db)
  return {
    user,
    profile,
    isStaff: !!staff,
    askForPlan: shouldAskForPlan({
      subscriptionsOn: isModuleEnabled("subscriptions"),
      askAfterSignUp: pricing.askAfterSignUp,
      isStaff: !!staff,
    }),
    hasPassword: passwordSet,
    passwordSignIn: policy.password,
    linked,
    signinProviders: policy.providers,
  }
}
