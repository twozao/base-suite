import { fail, redirect } from "@sveltejs/kit"
import { emit } from "$lib/server/plugins/events"
import { z } from "zod"
import { safeNextPath } from "$lib/safe_redirect"
import { createUser, markEmailVerified } from "$lib/server/auth/users"
import {
  mailConfigured,
  sendVerificationEmail,
  startSession,
} from "$lib/server/auth/flows"
import { clientIp } from "$lib/server/security/request"
import { rateLimit, RATE_LIMITS } from "$lib/server/security/rate_limit"
import { ownerClaim, signinPolicy } from "$lib/server/auth/signin"
import { emailField, newPasswordField, parseAuthForm } from "../auth_forms"
import type { Actions } from "./$types"

const schema = z.object({
  email: emailField,
  password: newPasswordField,
  setupCode: z.string().max(200),
})

export const actions: Actions = {
  default: async (event) => {
    const form = await parseAuthForm(
      event.request,
      schema,
      ["email", "password", "setupCode"],
      ["email"],
    )
    if (!form.ok) return form.failure
    const { email, password, setupCode } = form.data
    const db = event.locals.db
    const policy = await signinPolicy(db)
    if (!policy.canSignUp || !policy.password) {
      return fail(403, { error: "New accounts are not open.", email })
    }
    if (
      !(await rateLimit(db, `signup:${clientIp(event)}`, RATE_LIMITS.signUp))
    ) {
      return fail(429, {
        error: "Too many sign-ups from this address. Try again later.",
        email,
      })
    }
    const claimOwner = await ownerClaim(db, setupCode)
    if (policy.setupCode && !claimOwner)
      return fail(400, {
        error: "That setup code is not right.",
        email,
      })
    const result = await createUser(db, { email, password, claimOwner })
    if (!result.ok) {
      return fail(400, {
        error: "An account with that email already exists. Sign in instead.",
        email,
      })
    }
    // Without a mail provider there is no way to verify, so the address is taken as given.
    if (mailConfigured())
      await sendVerificationEmail(event, result.user.id, result.user.email)
    else await markEmailVerified(db, result.user.id)
    await emit(db, "user.created", { id: result.user.id })
    redirect(
      303,
      await startSession(
        event,
        result.user.id,
        safeNextPath(event.url.searchParams.get("next")),
      ),
    )
  },
}
