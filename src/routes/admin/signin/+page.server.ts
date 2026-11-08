import { fail } from "@sveltejs/kit"
import { audit } from "$lib/server/audit"
import { requirePermission } from "$lib/server/auth/staff"
import { linkedProviders } from "$lib/server/auth/oauth_accounts"
import {
  providerStatus,
  saveProviderSecret,
  signinChangeProblem,
} from "$lib/server/auth/signin"
import { mailConfigured } from "$lib/server/auth/flows"
import { getSettings, saveSetting } from "$lib/server/settings"
import { settingsSchema } from "$lib/server/settings"
import {
  OAUTH_PROVIDERS,
  PROVIDER_INFO,
  type OAuthProviderId,
} from "$lib/signin_providers"
import type { Actions, PageServerLoad } from "./$types"

const SECRET_MAX = 500

export const load: PageServerLoad = async (event) => {
  const staff = await requirePermission(event, "settings.manage")
  const db = event.locals.db
  const { signin } = await getSettings(db)
  const linked = await linkedProviders(db, staff.userId)
  const providers = await Promise.all(
    OAUTH_PROVIDERS.map(async (id) => ({
      id,
      ...PROVIDER_INFO[id],
      enabled: signin[id].enabled,
      clientId: signin[id].clientId,
      ...(await providerStatus(db, id)),
      linked: linked.includes(id),
      callbackUrl: `${event.url.origin}/auth/oauth/${id}/callback`,
    })),
  )
  return {
    enabled: signin.enabled,
    allowSignUp: signin.allowSignUp,
    password: signin.password,
    providers,
    mailConfigured: mailConfigured(),
  }
}

export const actions: Actions = {
  default: async (event) => {
    const staff = await requirePermission(event, "settings.manage")
    const db = event.locals.db
    const f = await event.request.formData()
    const bool = (k: string) => f.get(k) === "on"
    const str = (k: string) => String(f.get(k) ?? "").trim()

    const parsed = settingsSchema.signin.safeParse({
      enabled: bool("enabled"),
      allowSignUp: bool("allowSignUp"),
      password: bool("password"),
      google: {
        enabled: bool("google_enabled"),
        clientId: str("google_clientId"),
      },
      github: {
        enabled: bool("github_enabled"),
        clientId: str("github_clientId"),
      },
    })
    if (!parsed.success)
      return fail(400, { error: parsed.error.issues[0].message })
    const next = parsed.data

    // Work out what each provider will have after this save, before anything is written.
    const newSecret = {} as Record<OAuthProviderId, string>
    const configured = {} as Record<OAuthProviderId, boolean>
    for (const id of OAUTH_PROVIDERS) {
      newSecret[id] = str(`${id}_secret`)
      if (newSecret[id].length > SECRET_MAX)
        return fail(400, {
          error: `${PROVIDER_INFO[id].label} client secret is too long.`,
        })
      const status = await providerStatus(db, id)
      const removing = bool(`${id}_remove_secret`) && !newSecret[id]
      configured[id] =
        status.fromEnv ||
        (!!next[id].clientId &&
          (!!newSecret[id] || (status.hasSecret && !removing)))
    }
    const problem = signinChangeProblem(next, {
      configured,
      linked: await linkedProviders(db, staff.userId),
    })
    if (problem) return fail(400, { error: problem })

    try {
      for (const id of OAUTH_PROVIDERS) {
        const removing = bool(`${id}_remove_secret`) && !newSecret[id]
        if (!newSecret[id] && !removing) continue
        await saveProviderSecret(db, id, newSecret[id] || null, staff.userId)
        // Records that it changed, never the value.
        await audit(event, "auth.oauth_secret_changed", {
          type: "settings",
          id,
        })
      }
    } catch (e) {
      console.error(
        "saving oauth secret failed",
        e instanceof Error ? e.message : "",
      )
      return fail(500, {
        error:
          "Could not store the secret. On a host without a writable disk, set PRIVATE_SECRETS_KEY.",
      })
    }
    await saveSetting(db, "signin", next, staff.userId)
    await audit(event, "settings.updated", { type: "settings", id: "signin" })
    return { message: "Saved - live on your site now" }
  },
}
