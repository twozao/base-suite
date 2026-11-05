import { redirect } from "@sveltejs/kit"
import { consumeToken, markEmailVerified } from "$lib/server/auth/users"
import type { RequestHandler } from "./$types"

// Link target of the verification email. Works signed in or out.
export const GET: RequestHandler = async ({ url, locals }) => {
  const userId = await consumeToken(
    locals.db,
    url.searchParams.get("token") ?? "",
    "verify_email",
  )
  if (!userId) redirect(303, "/login/sign_in?verify_failed=true")
  await markEmailVerified(locals.db, userId)
  redirect(
    303,
    locals.user ? "/account?verified=true" : "/login/sign_in?verified=true",
  )
}
