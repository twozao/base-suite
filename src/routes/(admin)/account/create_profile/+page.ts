import { redirect } from "@sveltejs/kit"
import { hasFullProfile } from "$lib/profile"

export async function load({ parent }) {
  const data = await parent()
  if (hasFullProfile(data?.profile))
    redirect(303, data.askForPlan ? "/account/select_plan" : "/account")
  return data
}
