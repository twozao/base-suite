import { redirect } from "@sveltejs/kit"
import { hasFullProfile } from "$lib/profile"

export async function load({ parent }) {
  const data = await parent()
  // They completed their profile: on to "Select a plan".
  if (hasFullProfile(data?.profile)) redirect(303, "/account/select_plan")
  return data
}
