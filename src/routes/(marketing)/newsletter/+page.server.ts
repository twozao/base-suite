import { fail } from "@sveltejs/kit"
import { requireModule } from "$lib/server/auth/staff"
import { clientIp } from "$lib/server/security/request"
import { rateLimit } from "$lib/server/security/rate_limit"
import { subscribe, subscribeSchema } from "$lib/server/newsletter"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = () => {
  requireModule("newsletter")
}

export const actions: Actions = {
  default: async (event) => {
    requireModule("newsletter")
    const f = await event.request.formData()
    if (f.get("website_url")) return { done: true, confirmed: false } // honeypot
    const parsed = subscribeSchema.safeParse({
      email: f.get("email"),
      name: f.get("name") || undefined,
      source: String(f.get("source") ?? "").slice(0, 100) || undefined,
    })
    if (!parsed.success)
      return fail(400, { error: parsed.error.issues[0].message })
    const ok = await rateLimit(
      event.locals.db,
      `newsletter:${clientIp(event)}`,
      { windowSeconds: 3600, max: 5 },
    )
    if (!ok)
      return fail(429, { error: "Too many attempts. Please try again later." })
    try {
      const { confirmed } = await subscribe(event, parsed.data)
      return { done: true, confirmed }
    } catch (e) {
      console.error(e)
      return fail(500, { error: "Something went wrong. Please try again." })
    }
  },
}
