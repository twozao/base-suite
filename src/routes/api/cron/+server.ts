import { error, json } from "@sveltejs/kit"
import { env } from "$env/dynamic/private"
import { sendDueReminders } from "$lib/server/booking/notify"
import { timingSafeEqual } from "$lib/server/security/crypto"
import type { RequestHandler } from "./$types"

// Called by the Cloudflare Cron Trigger (cloudflare/worker.js) with CRON_SECRET. Node uses a timer instead.
export const POST: RequestHandler = async ({ request, locals }) => {
  const given = request.headers.get("x-cron-secret") ?? ""
  if (!env.CRON_SECRET || !given || !timingSafeEqual(given, env.CRON_SECRET))
    error(404, "Not found")
  return json({ sent: await sendDueReminders(locals.db) })
}
