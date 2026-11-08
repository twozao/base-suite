import { error, redirect, type RequestEvent } from "@sveltejs/kit"
import { safeNextPath } from "$lib/safe_redirect"
import { isOAuthProvider, type OAuthProviderId } from "$lib/signin_providers"
import { authorizeUrl, newFlowSecrets } from "$lib/server/auth/oauth"
import { providerCredentials, signinPolicy } from "$lib/server/auth/signin"
import { getSettings } from "$lib/server/settings"
import { clientIp } from "$lib/server/security/request"
import { rateLimit, RATE_LIMITS } from "$lib/server/security/rate_limit"

export const FLOW_COOKIE = "oauth_flow"
const COOKIE_PATH = "/auth/oauth"

export type Flow = {
  provider: OAuthProviderId
  state: string
  verifier: string
  next: string
  /** Set when connecting a provider from Account -> Settings. */
  linkUserId: string | null
}

export const callbackUrl = (origin: string, id: OAuthProviderId) =>
  `${origin}/auth/oauth/${id}/callback`

export const readFlow = (event: Pick<RequestEvent, "cookies">): Flow | null => {
  const raw = event.cookies.get(FLOW_COOKIE)
  if (!raw) return null
  try {
    const flow = JSON.parse(atob(raw)) as Flow
    return flow && typeof flow.state === "string" ? flow : null
  } catch {
    return null
  }
}

export const clearFlow = (event: Pick<RequestEvent, "cookies">) =>
  event.cookies.delete(FLOW_COOKIE, { path: COOKIE_PATH })

/** Sets the short-lived, httpOnly flow cookie and sends the browser to the provider. */
export const startFlow = async (
  event: RequestEvent,
  next: string | null,
  linkUserId: string | null,
) => {
  const id = event.params.provider
  if (!isOAuthProvider(id)) error(404, "Not found")
  const db = event.locals.db
  const { signin } = await getSettings(db)
  const policy = await signinPolicy(db)
  const creds = policy.providers.some((p) => p.id === id)
    ? await providerCredentials(db, signin, id)
    : null
  if (!creds) error(404, "Not found")
  if (
    !(await rateLimit(db, `oauth:${clientIp(event)}`, RATE_LIMITS.oauthStart))
  )
    error(429, "Too many attempts. Try again in a few minutes.")
  const secrets = newFlowSecrets()
  const flow: Flow = {
    provider: id,
    ...secrets,
    next: safeNextPath(next),
    linkUserId,
  }
  event.cookies.set(FLOW_COOKIE, btoa(JSON.stringify(flow)), {
    path: COOKIE_PATH,
    httpOnly: true,
    sameSite: "lax",
    secure: event.url.protocol === "https:",
    maxAge: 600,
  })
  redirect(
    303,
    await authorizeUrl(id, creds, callbackUrl(event.url.origin, id), secrets),
  )
}
