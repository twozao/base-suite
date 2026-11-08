import { redirect } from "@sveltejs/kit"
import type { PageServerLoad } from "./$types"

// Nothing to choose between when new accounts are closed.
export const load: PageServerLoad = async ({ parent, url }) => {
  const { signin } = await parent()
  if (!signin.canSignUp) redirect(303, `/login/sign_in${url.search}`)
}
