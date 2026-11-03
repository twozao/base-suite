import { requireModule } from "$lib/server/auth/staff"
import { confirm } from "$lib/server/newsletter"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  requireModule("newsletter")
  event.setHeaders({ "cache-control": "private, no-store" })
  return { ok: await confirm(event, event.url.searchParams.get("token") ?? "") }
}
