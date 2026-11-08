import { error, json } from "@sveltejs/kit"
import { finishSignIn, signInOptions } from "$lib/server/auth/passkeys"
import { passkeySession } from "$lib/server/auth/two_factor"
import { maySignIn, signinPolicy } from "$lib/server/auth/signin"
import { recordSignIn } from "$lib/server/auth/users"
import { safeNextPath } from "$lib/safe_redirect"
import { clientIp, isSameOrigin } from "$lib/server/security/request"
import { rateLimit, RATE_LIMITS } from "$lib/server/security/rate_limit"
import type { RequestHandler } from "./$types"

// Step 1 (no body): options for the browser. Step 2 (body with the passkey's answer): opens the session.
export const POST: RequestHandler = async (event) => {
  if (!isSameOrigin(event)) error(403, "Cross-origin request blocked")
  const db = event.locals.db
  if (!(await rateLimit(db, `passkey:${clientIp(event)}`, RATE_LIMITS.signIn)))
    error(429, "Too many attempts. Try again in a few minutes.")
  const body = await event.request.json().catch(() => null)
  if (!body?.response) return json(await signInOptions(event))
  const userId = await finishSignIn(event, body.response)
  if (!userId) error(400, "That passkey could not be used here")
  const policy = await signinPolicy(db)
  if (!(await maySignIn(db, policy, userId)))
    error(403, "Sign-in is limited to staff.")
  await passkeySession(event, userId)
  await recordSignIn(db, userId)
  return json({
    next: safeNextPath(typeof body.next === "string" ? body.next : null),
  })
}
