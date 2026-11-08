import { error, redirect } from "@sveltejs/kit"
import { startFlow } from "./flow.server"
import type { RequestHandler } from "./$types"

// GET starts a sign-in. Connecting to an existing account is POST only, so SvelteKit's origin
// check stops another site from starting it on a signed-in visitor's behalf.
export const GET: RequestHandler = async (event) => {
  if (event.locals.user) redirect(303, "/account")
  return startFlow(event, event.url.searchParams.get("next"), null)
}

export const POST: RequestHandler = async (event) => {
  if (!event.locals.user) error(401, "Sign in first")
  return startFlow(event, "/account/settings", event.locals.user.id)
}
