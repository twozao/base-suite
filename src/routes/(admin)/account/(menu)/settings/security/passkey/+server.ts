import { error, json } from "@sveltejs/kit"
import { audit } from "$lib/server/audit"
import {
  finishRegistration,
  registrationOptions,
} from "$lib/server/auth/passkeys"
import { getSettings } from "$lib/server/settings"
import {
  markSessionMfa,
  newRecoveryCodes,
  secondFactors,
} from "$lib/server/auth/two_factor"
import { isSameOrigin } from "$lib/server/security/request"
import type { RequestHandler } from "./$types"

// Step 1 (no body): registration options. Step 2 (the browser's answer): stores the passkey.
export const POST: RequestHandler = async (event) => {
  const user = event.locals.user
  if (!user) error(401, "Sign in first")
  if (!isSameOrigin(event)) error(403, "Cross-origin request blocked")
  const body = await event.request.json().catch(() => null)
  if (!body?.response) {
    const { brand } = await getSettings(event.locals.db)
    return json(await registrationOptions(event, user, brand.siteName))
  }
  const r = await finishRegistration(
    event,
    user.id,
    body.response,
    String(body.name ?? ""),
  )
  if ("error" in r) error(400, r.error)
  await audit(event, "auth.passkey_added", { type: "user", id: user.id })
  await markSessionMfa(event.locals.db, event.locals.session?.id)
  // Someone with only a passkey needs recovery codes too, in case the device is lost.
  const f = await secondFactors(event.locals.db, user.id)
  const codes = f.recoveryLeft
    ? null
    : await newRecoveryCodes(event.locals.db, user.id)
  return json({ ok: true, codes })
}
