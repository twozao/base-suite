import { requireModule } from "$lib/server/auth/staff"
import { unsubscribe } from "$lib/server/newsletter"
import type { Actions, PageServerLoad } from "./$types"

// GET only shows a button: link scanners and prefetchers must not unsubscribe anyone. The POST does the work.
// RFC 8058 one-click (List-Unsubscribe headers plus a CSRF-exempt POST) is not implemented; nothing sends newsletters yet.
export const load: PageServerLoad = ({ url, setHeaders }) => {
  requireModule("newsletter")
  setHeaders({ "cache-control": "private, no-store" })
  return { token: (url.searchParams.get("token") ?? "").slice(0, 100) }
}

export const actions: Actions = {
  default: async (event) => {
    requireModule("newsletter")
    const f = await event.request.formData()
    const token = String(
      f.get("token") ?? event.url.searchParams.get("token") ?? "",
    )
    return { done: await unsubscribe(event, token) }
  },
}
