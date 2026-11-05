import { fail, redirect } from "@sveltejs/kit"
import { z } from "zod"
import {
  consumeToken,
  markEmailVerified,
  updatePassword,
} from "$lib/server/auth/users"
import { invalidateUserSessions } from "$lib/server/auth/session"
import { newPasswordField, parseAuthForm } from "../auth_forms"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ url }) => {
  const token = url.searchParams.get("token") ?? ""
  if (!token) redirect(303, "/login/forgot_password")
  return { token }
}

const schema = z
  .object({
    token: z.string().min(1).max(100),
    newPassword1: newPasswordField,
    newPassword2: z.string().min(1, "Type the new password twice"),
  })
  .refine((p) => p.newPassword1 === p.newPassword2, {
    message: "The passwords don't match",
    path: ["newPassword2"],
  })

// A redeemed token proves control of the mailbox, so the address counts as verified too.
export const actions: Actions = {
  default: async (event) => {
    const form = await parseAuthForm(event.request, schema, [
      "token",
      "newPassword1",
      "newPassword2",
    ])
    if (!form.ok) return form.failure
    const db = event.locals.db
    const userId = await consumeToken(db, form.data.token, "reset_password")
    if (!userId) {
      return fail(400, {
        error: "This reset link is invalid or has expired. Request a new one.",
      })
    }
    await updatePassword(db, userId, form.data.newPassword1)
    await markEmailVerified(db, userId)
    await invalidateUserSessions(db, userId)
    redirect(303, "/login/sign_in?reset=true")
  },
}
