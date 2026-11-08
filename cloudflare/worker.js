// Worker entry: the SvelteKit app, plus the Cron Trigger that sends booking reminders.
import app from "../.svelte-kit/cloudflare/_worker.js"

export default {
  fetch: app.fetch,
  async scheduled(_controller, env, ctx) {
    if (!env.CRON_SECRET) return
    const request = new Request("https://cron.invalid/api/cron", {
      method: "POST",
      headers: { "x-cron-secret": env.CRON_SECRET },
    })
    ctx.waitUntil(app.fetch(request, env, ctx))
  },
}
