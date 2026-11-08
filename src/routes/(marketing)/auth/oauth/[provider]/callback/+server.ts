import { error, redirect } from "@sveltejs/kit"
import { timingSafeEqual } from "$lib/server/security/crypto"
import { isOAuthProvider } from "$lib/signin_providers"
import { startSession } from "$lib/server/auth/flows"
import { fetchProfile, type OAuthProfile } from "$lib/server/auth/oauth"
import { linkToUser, resolveOAuthUser } from "$lib/server/auth/oauth_accounts"
import {
  maySignIn,
  providerCredentials,
  signinPolicy,
} from "$lib/server/auth/signin"
import { recordSignIn } from "$lib/server/auth/users"
import { getSettings } from "$lib/server/settings"
import { callbackUrl, clearFlow, readFlow } from "../flow.server"
import type { RequestHandler } from "./$types"

function signInError(code: string): never {
  redirect(303, `/login/sign_in?oauth_error=${code}`)
}
function settingsError(code: string): never {
  redirect(303, `/account/settings?oauth_error=${code}`)
}

export const GET: RequestHandler = async (event) => {
  const id = event.params.provider
  if (!isOAuthProvider(id)) error(404, "Not found")
  const { url, locals } = event
  const flow = readFlow(event)
  clearFlow(event)
  const state = url.searchParams.get("state") ?? ""
  if (!flow || flow.provider !== id || !timingSafeEqual(flow.state, state))
    signInError("state")
  const fail: (code: string) => never = flow.linkUserId
    ? settingsError
    : signInError
  const code = url.searchParams.get("code")
  if (!code || code.length > 2000) fail("denied")

  const db = locals.db
  const policy = await signinPolicy(db)
  const creds = policy.providers.some((p) => p.id === id)
    ? await providerCredentials(db, (await getSettings(db)).signin, id)
    : null
  if (!creds) fail("provider_failed")

  let profile: OAuthProfile
  try {
    profile = await fetchProfile(id, creds, {
      code,
      verifier: flow.verifier,
      redirectUri: callbackUrl(url.origin, id),
    })
  } catch (e) {
    console.error(
      "oauth callback failed",
      id,
      e instanceof Error ? e.message : "",
    )
    fail("provider_failed")
  }

  if (flow.linkUserId) {
    if (locals.user?.id !== flow.linkUserId) signInError("state")
    const linked = await linkToUser(db, profile, flow.linkUserId)
    if (!linked.ok) settingsError(linked.reason)
    redirect(303, "/account/settings?oauth=connected")
  }
  if (locals.user) redirect(303, "/account")

  const result = await resolveOAuthUser(db, profile, policy)
  if (!result.ok) signInError(result.reason)
  const { userId } = result
  if (!(await maySignIn(db, policy, userId))) signInError("closed")
  await recordSignIn(db, userId)
  await startSession(event, userId)
  redirect(303, flow.next)
}
