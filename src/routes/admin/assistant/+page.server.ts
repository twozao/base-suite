import { requireModule, requirePermission } from "$lib/server/auth/staff"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  requireModule("assistant")
  await requirePermission(event, "assistant.manage")
}
