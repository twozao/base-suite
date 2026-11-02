import { error } from "@sveltejs/kit"
import { requireModule } from "$lib/server/auth/staff"
import { getSettings } from "$lib/server/settings"
import { calendlyEmbedUrl } from "$lib/server/booking/calendly"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ locals, url, setHeaders }) => {
  requireModule("booking")
  const settings = await getSettings(locals.supabaseServiceRole)
  if (!settings.booking.enabled) error(404, "Not found")

  let name: string | null = null
  if (locals.user) {
    const { data } = await locals.supabaseServiceRole
      .from("profiles")
      .select("full_name")
      .eq("id", locals.user.id)
      .maybeSingle()
    name = data?.full_name ?? null
  }
  setHeaders({
    "cache-control": locals.user
      ? "private, max-age=0"
      : "public, max-age=60, s-maxage=300",
  })

  return {
    intro: settings.booking.intro,
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
