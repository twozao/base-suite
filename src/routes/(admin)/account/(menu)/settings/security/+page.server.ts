import { fail, redirect } from "@sveltejs/kit"
import { audit } from "$lib/server/audit"
import { listPasskeys } from "$lib/server/auth/passkeys"
import { invalidateSession } from "$lib/server/auth/session"
import {
  beginTotpSetup,
  checkTotp,
  disableTotp,
  markSessionMfa,
  totpEnabled,
  enableTotp,
  newRecoveryCodes,
  secondFactors,
  totpUri,
} from "$lib/server/auth/two_factor"
import { getSettings } from "$lib/server/settings"
import { rateLimit, RATE_LIMITS } from "$lib/server/security/rate_limit"
import type { Actions, PageServerLoad, RequestEvent } from "./$types"

const me = (event: RequestEvent) => {
  const user = event.locals.user
  if (!user) redirect(303, "/login/sign_in?next=/account/settings/security")
  return user
}

export const load: PageServerLoad = async (event) => {
  const user = me(event)
  const db = event.locals.db
  const [factors, passkeys, sessions, settings] = await Promise.all([
    secondFactors(db, user.id),
    listPasskeys(db, user.id),
    db
      .selectFrom("sessions")
      .select(["id", "user_agent", "created_at", "last_seen_at", "mfa"])
      .where("user_id", "=", user.id)
      .where("expires_at", ">", new Date().toISOString())
      .orderBy("last_seen_at", "desc")
      .execute(),
    getSettings(db),
  ])
  return {
    factors,
    passkeys,
    required: settings.security.requireStaff2fa,
    setupNeeded: event.url.searchParams.has("required"),
    sessions: sessions.map((s) => ({
      // Only a short prefix of the hashed id leaves the server, enough to pick one to sign out.
      ref: s.id.slice(0, 16),
      current: s.id === event.locals.session?.id,
      device: s.user_agent ?? "Unknown device",
      created: s.created_at,
      seen: s.last_seen_at,
      mfa: !!s.mfa,
    })),
  }
}

const codeLimit = (event: RequestEvent, userId: string) =>
  rateLimit(event.locals.db, `2fa-setup:${userId}`, RATE_LIMITS.signIn)

export const actions: Actions = {
  totpStart: async (event) => {
    const user = me(event)
    if (await totpEnabled(event.locals.db, user.id))
      return fail(400, {
        error:
          "Two-step sign-in is already on. Turn it off with a current code first.",
      })
    const { brand } = await getSettings(event.locals.db)
    const secret = await beginTotpSetup(event.locals.db, user.id)
    return {
      setup: { secret, uri: totpUri(secret, user.email, brand.siteName) },
    }
  },
  totpConfirm: async (event) => {
    const user = me(event)
    const code = String((await event.request.formData()).get("code") ?? "")
    if (!(await codeLimit(event, user.id)))
      return fail(429, { error: "Too many attempts. Wait a few minutes." })
    if (!(await checkTotp(event.locals.db, user.id, code, false)))
      return fail(400, {
        error:
          "That code is not right. Check the time on your phone and try again.",
      })
    await enableTotp(event.locals.db, user.id)
    await markSessionMfa(event.locals.db, event.locals.session?.id)
    const codes = await newRecoveryCodes(event.locals.db, user.id)
    await audit(event, "auth.2fa_enabled", { type: "user", id: user.id })
    return { message: "Two-step sign-in is on", codes }
  },
  totpDisable: async (event) => {
    const user = me(event)
    const code = String((await event.request.formData()).get("code") ?? "")
    if (!(await codeLimit(event, user.id)))
      return fail(429, { error: "Too many attempts. Wait a few minutes." })
    if (!(await checkTotp(event.locals.db, user.id, code)))
      return fail(400, {
        error: "Enter a current code from your app to turn this off",
      })
    await disableTotp(event.locals.db, user.id)
    await audit(event, "auth.2fa_disabled", { type: "user", id: user.id })
    return { message: "Two-step sign-in is off" }
  },
  codes: async (event) => {
    const user = me(event)
    const code = String((await event.request.formData()).get("code") ?? "")
    if (!(await codeLimit(event, user.id)))
      return fail(429, { error: "Too many attempts. Wait a few minutes." })
    if (!(await checkTotp(event.locals.db, user.id, code)))
      return fail(400, { error: "Enter a current code from your app first" })
    const codes = await newRecoveryCodes(event.locals.db, user.id)
    await audit(event, "auth.recovery_codes_created", {
      type: "user",
      id: user.id,
    })
    return {
      message: "New recovery codes made; the old ones no longer work",
      codes,
    }
  },
  passkeyRemove: async (event) => {
    const user = me(event)
    const id = String((await event.request.formData()).get("id") ?? "").slice(
      0,
      512,
    )
    await event.locals.db
      .deleteFrom("user_passkeys")
      .where("id", "=", id)
      .where("user_id", "=", user.id)
      .execute()
    await audit(event, "auth.passkey_removed", { type: "user", id: user.id })
    return { message: "Passkey removed" }
  },
  signOut: async (event) => {
    const user = me(event)
    const ref = String((await event.request.formData()).get("ref") ?? "")
    const db = event.locals.db
    const rows = await db
      .selectFrom("sessions")
      .select("id")
      .where("user_id", "=", user.id)
      .execute()
    const targets =
      ref === "others"
        ? rows.filter((r) => r.id !== event.locals.session?.id)
        : rows.filter(
            (r) => r.id.slice(0, 16) === ref && /^[0-9a-f]{16}$/.test(ref),
          )
    for (const t of targets) await invalidateSession(db, t.id)
    await audit(
      event,
      "auth.sessions_revoked",
      { type: "user", id: user.id },
      { count: targets.length },
    )
    return {
      message:
        targets.length === 1
          ? "Signed out of that device"
          : `Signed out of ${targets.length} devices`,
    }
  },
}
