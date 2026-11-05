import { fail } from "@sveltejs/kit"
import { z } from "zod"
import { findUserByEmail } from "$lib/server/auth/users"
import { mailConfigured, sendPasswordResetEmail } from "$lib/server/auth/flows"
import { clientIp } from "$lib/server/security/request"
import { rateLimit, RATE_LIMITS } from "$lib/server/security/rate_limit"
import { emailField, parseAuthForm } from "../auth_forms"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async () => ({
  mailConfigured: mailConfigured(),
})

const schema = z.object({ email: emailField })

// Answers the same whether or not the address exists, so the form cannot be used to find accounts.
export const actions: Actions = {
  default: async (event) => {
    const form = await parseAuthForm(
      event.request,
      schema,
      ["email"],
      ["email"],
    )
    if (!form.ok) return form.failure
    const { email } = form.data
    const db = event.locals.db
    if (
      !(await rateLimit(
        db,
        `reset:${clientIp(event)}`,
        RATE_LIMITS.passwordReset,
      ))
    ) {
      return fail(429, { error: "Too many requests. Try again later.", email })
    }
    const user = await findUserByEmail(db, email)
    if (user) await sendPasswordResetEmail(event, user.id, user.email)
    return { sent: true, email }
  },
}
