import { fail, redirect } from "@sveltejs/kit"
import { z } from "zod"
import { safeNextPath } from "$lib/safe_redirect"
import { signInWithPassword } from "$lib/server/auth/users"
import { startSession } from "$lib/server/auth/flows"
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
    const key = `signin:${clientIp(event)}:${email.toLowerCase()}`
    if (!(await rateLimit(db, key, RATE_LIMITS.signIn))) {
      return fail(429, {
        error: "Too many attempts. Try again in a few minutes.",
        email,
      })
    }
    const user = await signInWithPassword(db, email, password)
    if (!user)
      return fail(400, { error: "Email or password is incorrect", email })
    await startSession(event, user.id)
    redirect(303, safeNextPath(event.url.searchParams.get("next")))
  },
}
