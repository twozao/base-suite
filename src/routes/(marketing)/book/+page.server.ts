import { error } from "@sveltejs/kit"
import { requireModule } from "$lib/server/auth/staff"
import { getSettings } from "$lib/server/settings"
import { calendlyEmbedUrl } from "$lib/server/booking/calendly"
import {
  listEventTypes,
  publicEventType,
} from "$lib/server/booking/event_types"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ locals, url, setHeaders }) => {
  requireModule("booking")
  const settings = await getSettings(locals.db)
  if (!settings.booking.enabled) error(404, "Not found")

  let name: string | null = null
  if (locals.user) {
    const profile = await locals.db
      .selectFrom("profiles")
      .select("full_name")
      .where("id", "=", locals.user.id)
      .executeTakeFirst()
    name = profile?.full_name ?? null
  }
  setHeaders({
    "cache-control": locals.user
      ? "private, max-age=0"
      : "public, max-age=60, s-maxage=300",
  })

  return {
    intro: settings.booking.intro,
    native: (await listEventTypes(locals.db, { activeOnly: true })).map(
      publicEventType,
    ),
    eventTypes: settings.booking.eventTypes.map((t) => ({
      label: t.label,
      description: t.description,
      durationMinutes: t.durationMinutes,
      embedUrl: calendlyEmbedUrl(t.url, {
        host: url.host,
        name,
        email: locals.user?.email ?? null,
      }),
    })),
  }
}
