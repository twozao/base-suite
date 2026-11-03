// src/hooks.server.ts
import { PRIVATE_SUPABASE_SERVICE_ROLE } from "$env/static/private"
import {
  PUBLIC_SUPABASE_ANON_KEY,
  PUBLIC_SUPABASE_URL,
} from "$env/static/public"
import { createServerClient } from "@supabase/ssr"
import { createClient, type AMREntry } from "@supabase/supabase-js"
import { error, redirect, type Handle } from "@sveltejs/kit"
import { getStaff } from "$lib/server/auth/staff"
import { getSettings } from "$lib/server/settings"
import { setModuleSwitches } from "$lib/modules"
import { sequence } from "@sveltejs/kit/hooks"

export const supabase: Handle = async ({ event, resolve }) => {
  event.locals.supabase = createServerClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => event.cookies.getAll(),
        /**
         * SvelteKit's cookies API requires `path` to be explicitly set in
         * the cookie options. Setting `path` to `/` replicates previous/
         * standard behavior.
         */
        setAll: (
          cookiesToSet: {
            name: string
            value: string
            options: Record<string, unknown>
          }[],
        ) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            event.cookies.set(name, value, { ...options, path: "/" })
          })
        },
      },
    },
  )

  event.locals.supabaseServiceRole = createClient(
    PUBLIC_SUPABASE_URL,
    PRIVATE_SUPABASE_SERVICE_ROLE,
    { auth: { persistSession: false } },
  )

  // https://github.com/supabase/auth-js/issues/888#issuecomment-2189298518
  if ("suppressGetSessionWarning" in event.locals.supabase.auth) {
    // @ts-expect-error - suppressGetSessionWarning is not part of the official API
    event.locals.supabase.auth.suppressGetSessionWarning = true
  } else {
    console.warn(
      "SupabaseAuthClient#suppressGetSessionWarning was removed. See https://github.com/supabase/auth-js/issues/888.",
    )
  }

  /**
   * Unlike `supabase.auth.getSession()`, which returns the session _without_
   * validating the JWT, this function also calls `getUser()` to validate the
   * JWT before returning the session.
   */
  event.locals.safeGetSession = async () => {
    const {
      data: { session },
    } = await event.locals.supabase.auth.getSession()
    if (!session) {
      return { session: null, user: null, amr: null }
    }

    const {
      data: { user },
      error: userError,
    } = await event.locals.supabase.auth.getUser()
    if (userError) {
      // JWT validation has failed
      return { session: null, user: null, amr: null }
    }

    const { data: aal, error: amrError } =
      await event.locals.supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (amrError) {
      return { session, user, amr: null }
    }

    return {
      session,
      user,
      amr: aal.currentAuthenticationMethods as AMREntry[],
    }
  }

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === "content-range" || name === "x-supabase-api-version"
    },
  })
}

// Not called for prerendered marketing pages so generally okay to call on ever server request
// Next-page CSR will mean relatively minimal calls to this hook
// Load the owner's module switches (Admin -> Modules) before any route runs.
// getSettings is cached per instance, so this is usually free.
const modules: Handle = async ({ event, resolve }) => {
  const s = await getSettings(event.locals.supabaseServiceRole)
  setModuleSwitches(s.modules.switches)
  return resolve(event)
}

const authGuard: Handle = async ({ event, resolve }) => {
  const { session, user } = await event.locals.safeGetSession()
  event.locals.session = session
  event.locals.user = user

  return resolve(event)
}

// Security headers for every server-rendered response. The Content Security
// Policy itself is configured in svelte.config.js so SvelteKit can add hashes /
// nonces for its own inline scripts (it also covers prerendered pages).
const securityHeaders: Handle = async ({ event, resolve }) => {
  const response = await resolve(event)
  const h = response.headers
  // Webhook / API responses can't be framed anyway; for HTML pages this blocks
  // clickjacking. (frame-ancestors can't be set from a <meta> CSP.)
  if (!h.has("x-frame-options")) h.set("x-frame-options", "DENY")
  h.set("x-content-type-options", "nosniff")
  h.set("referrer-policy", "strict-origin-when-cross-origin")
  h.set(
    "permissions-policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  )
  h.set("cross-origin-opener-policy", "same-origin")
  if (event.url.protocol === "https:") {
    h.set("strict-transport-security", "max-age=63072000; includeSubDomains")
  }
  // Anonymous visitors on public pages: let a CDN cache briefly so admin
  // edits show up within a minute while traffic spikes hit the edge, not
  // the database. Signed-in users and anything setting cookies stay private.
  const path = event.url.pathname
  if (
    event.request.method === "GET" &&
    !event.locals.user &&
    !h.has("cache-control") &&
    !h.has("set-cookie") &&
    (h.get("content-type") ?? "").startsWith("text/html") &&
    !/^\/(admin|account|login|auth|api|search)(\/|$)/.test(path)
  ) {
    h.set(
      "cache-control",
      "public, max-age=0, s-maxage=60, stale-while-revalidate=600",
    )
  }
  // Never let shared caches store anything personalised.
  if (
    event.url.pathname.startsWith("/admin") ||
    event.url.pathname.startsWith("/account")
  ) {
    h.set("cache-control", "private, no-store")
  }
  return response
}

// Defence in depth for the admin portal: every /admin request needs a
// signed-in user. Each admin load/action then checks its own permission via
// requirePermission().
const adminGuard: Handle = async ({ event, resolve }) => {
  if (
    event.url.pathname === "/admin" ||
    event.url.pathname.startsWith("/admin/")
  ) {
    if (!event.locals.user) {
      redirect(
        303,
        `/login/sign_in?next=${encodeURIComponent(event.url.pathname)}`,
      )
    }
    const staff = await getStaff(event)
    if (!staff) error(404, "Not found")
  }
  return resolve(event)
}

export const handle: Handle = sequence(
  securityHeaders,
  supabase,
  modules,
  authGuard,
  adminGuard,
)
