import { redirect } from "@sveltejs/kit"
import { clearSessionCookie, invalidateSession } from "$lib/server/auth/session"
import type { Actions } from "./$types"

// Sign-out is a POST so a cross-site link cannot log the user out.
export const actions: Actions = {
  default: async ({ locals, cookies }) => {
    if (locals.session) await invalidateSession(locals.db, locals.session.id)
    clearSessionCookie(cookies)
    redirect(303, "/")
  },
}
