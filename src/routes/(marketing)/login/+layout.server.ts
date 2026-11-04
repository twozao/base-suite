import { redirect } from "@sveltejs/kit"
import type { LayoutServerLoad } from "./$types"

// Signed-in users have no business on the login pages.
export const load: LayoutServerLoad = async ({ locals }) => {
  if (locals.user) redirect(303, "/account")
  return {}
}
