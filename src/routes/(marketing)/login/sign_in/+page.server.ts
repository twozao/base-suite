import { fail, redirect } from "@sveltejs/kit"
import { z } from "zod"
import { safeNextPath } from "$lib/safe_redirect"
import { signInWithPassword } from "$lib/server/auth/users"
import { startSession } from "$lib/server/auth/flows"
import { maySignIn, signinPolicy } from "$lib/server/auth/signin"
import { PASSWORD_MAX } from "$lib/server/auth/password"
import { clientIp } from "$lib/server/security/request"
import { rateLimit, RATE_LIMITS } from "$lib/server/security/rate_limit"
import { emailField, parseAuthForm } from "../auth_forms"
import type { Actions } from "./$types"

const schema = z.object({
  email: emailField,
  password: z.string().min(1, "Password is required").max(PASSWORD_MAX),
})

export const actions: Actions = {
  default: async (event) => {
    const form = await parseAuthForm(
      event.request,
      schema,
      ["email", "password"],
      ["email"],
    )
    if (!form.ok) return form.failure
    const { email, password } = form.data
    const db = event.locals.db
    const policy = await signinPolicy(db)
    if (!policy.password)
      return fail(403, { error: "Password sign-in is turned off.", email })
    const key = `signin:${clientIp(event)}:${email.toLowerCase()}`
    if (
      !(await rateLimit(db, key, RATE_LIMITS.signIn)) ||
      !(await rateLimit(
        db,
        `signin-account:${email.toLowerCase()}`,
        RATE_LIMITS.signInAccount,
      ))
    ) {
      return fail(429, {
        error: "Too many attempts. Try again in a few minutes.",
        email,
      })
    }
    const user = await signInWithPassword(db, email, password)
    if (!user)
      return fail(400, { error: "Email or password is incorrect", email })
    if (!(await maySignIn(db, policy, user.id)))
      return fail(403, { error: "Sign-in is limited to staff.", email })
    redirect(
      303,
      await startSession(
        event,
        user.id,
        safeNextPath(event.url.searchParams.get("next")),
      ),
    )
  },
}
