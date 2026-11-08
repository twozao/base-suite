import { fail, redirect } from "@sveltejs/kit"
import {
  completeChallenge,
  pendingChallenge,
} from "$lib/server/auth/two_factor"
import { recordSignIn } from "$lib/server/auth/users"
import { safeNextPath } from "$lib/safe_redirect"
import { clientIp } from "$lib/server/security/request"
import { rateLimit, RATE_LIMITS } from "$lib/server/security/rate_limit"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  if (!(await pendingChallenge(event))) redirect(303, "/login/sign_in")
  return {}
}

export const actions: Actions = {
  default: async (event) => {
    const code = String((await event.request.formData()).get("code") ?? "")
      .trim()
      .slice(0, 40)
    if (!code) return fail(400, { error: "Enter the code" })
    if (
      !(await rateLimit(
        event.locals.db,
        `2fa:${clientIp(event)}`,
        RATE_LIMITS.signIn,
      ))
    )
      return fail(429, {
        error: "Too many attempts. Try again in a few minutes.",
      })
    const r = await completeChallenge(event, code)
    if (!r.ok) {
      if (r.expired) redirect(303, "/login/sign_in?mfa=expired")
      return fail(400, { error: "That code is not right" })
    }
    await recordSignIn(event.locals.db, r.userId)
    redirect(303, safeNextPath(r.next))
  },
}
