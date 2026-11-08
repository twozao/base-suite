import { env } from "$env/dynamic/private"
import { error, redirect, type Handle, type ServerInit } from "@sveltejs/kit"
import { sequence } from "@sveltejs/kit/hooks"
import { connect, connectD1, type Db } from "$lib/server/db"
import {
  SESSION_COOKIE,
  clearSessionCookie,
  invalidateSession,
  setSessionCookie,
  validateSession,
} from "$lib/server/auth/session"
import { getStaff } from "$lib/server/auth/staff"
import { accessConfigured, verifyAccess } from "$lib/server/auth/access"
import { secondFactors } from "$lib/server/auth/two_factor"
import { getSettings } from "$lib/server/settings"
import { setModuleSwitches } from "$lib/modules"
import { LOCALES, splitLocale } from "$lib/i18n"
import { sendDueReminders } from "$lib/server/booking/notify"
import { background, setBindings, setWaitUntil } from "$lib/server/platform"
import { bumpCacheVersion, cacheVersion } from "$lib/server/cache"
import { countHit, findRedirect, logNotFound } from "$lib/server/redirects"
import { deliverDue } from "$lib/server/plugins/events"

const REMINDER_POLL_MS = 5 * 60_000

let db: Db

// One database handle per process, migrated to the latest schema before the first request. On
// Cloudflare the D1 binding arrives with each request instead, and a Cron Trigger sends reminders.
export const init: ServerInit = async () => {
  if (__CLOUDFLARE__) return
  db = (await connect(env.DATABASE_URL ?? "")).db
  // Hosts that freeze idle processes send reminders late; each one is still only sent once.
  const remind = () =>
    Promise.all([sendDueReminders(db), deliverDue(db)]).catch((e) =>
      console.error(
        "scheduled work failed",
        e instanceof Error ? e.message : e,
      ),
    )
  setInterval(remind, REMINDER_POLL_MS).unref?.()
  void remind()
}

const database: Handle = async ({ event, resolve }) => {
  if (__CLOUDFLARE__) {
    const bindings = event.platform?.env
    if (!bindings?.DB)
      error(500, "The DB binding is missing from wrangler.toml")
    setBindings(bindings)
    const ctx = event.platform?.ctx as
      | { waitUntil?: (p: Promise<unknown>) => void }
      | undefined
    setWaitUntil(ctx?.waitUntil ? (p) => ctx.waitUntil!(p) : null)
    event.locals.db = await connectD1(bindings.DB)
    return resolve(event)
  }
  event.locals.db = db
  return resolve(event)
}

// Load the owner's module switches (Admin -> Modules) before any route runs; getSettings is cached.
const modules: Handle = async ({ event, resolve }) => {
  const s = await getSettings(event.locals.db)
  setModuleSwitches(s.modules.switches)
  return resolve(event)
}

const authGuard: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get(SESSION_COOKIE)
  const found = await validateSession(event.locals.db, token)
  if (!found) {
    if (token) clearSessionCookie(event.cookies)
    event.locals.user = null
    event.locals.session = null
    return resolve(event)
  }
  event.locals.user = found.user
  event.locals.session = found.session
  // With sign-in closed, customers are treated as signed out; their sessions return if it reopens.
  const { signin } = await getSettings(event.locals.db)
  if (!signin.enabled && !(await getStaff(event))) {
    event.locals.user = null
    event.locals.session = null
    event.locals.staff = null
    return resolve(event)
  }
  if (found.renewed && token) {
    setSessionCookie(
      event.cookies,
      token,
      found.session.expiresAt,
      event.url.protocol === "https:",
    )
  }
  return resolve(event)
}

// Security headers for every server-rendered response. The Content Security Policy itself lives in
// svelte.config.js so SvelteKit can add hashes for its own inline scripts.
const securityHeaders: Handle = async ({ event, resolve }) => {
  const response = await resolve(event)
  const h = response.headers
  const frame = event.locals.frameOrigin
  const csp = h.get("content-security-policy")
  if (frame && csp)
    h.set(
      "content-security-policy",
      csp.replace(/frame-src ([^;]*)/, `frame-src $1 ${frame}`),
    )
  if (!h.has("x-frame-options")) h.set("x-frame-options", "DENY")
  h.set("x-content-type-options", "nosniff")
  h.set("referrer-policy", "strict-origin-when-cross-origin")
  h.set(
    "permissions-policy",
    "camera=(), microphone=(), geolocation=(self), payment=(), usb=()",
  )
  h.set("cross-origin-opener-policy", "same-origin")
  if (event.url.protocol === "https:") {
    h.set("strict-transport-security", "max-age=63072000; includeSubDomains")
  }
  // Anonymous visitors on public pages: a CDN may cache briefly so admin edits show within a
  // minute while traffic spikes hit the edge. Signed-in users and anything setting cookies stay private.
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
  if (path.startsWith("/admin") || path.startsWith("/account")) {
    h.set("cache-control", "private, no-store")
  }
  return response
}

// Defence in depth for the admin portal: every /admin request needs a signed-in staff user.
// Each admin load/action then checks its own permission via requirePermission().
const adminGuard: Handle = async ({ event, resolve }) => {
  const path = event.url.pathname
  if (path === "/admin" || path.startsWith("/admin/")) {
    if (!event.locals.user) {
      redirect(303, `/login/sign_in?next=${encodeURIComponent(path)}`)
    }
    const staff = await getStaff(event)
    if (!staff) error(404, "Not found")
    if (accessConfigured() && !(await verifyAccess(event.request)))
      error(403, "This admin is protected by Cloudflare Access")
    const { security } = await getSettings(event.locals.db)
    if (security.requireStaff2fa && !event.locals.session?.mfa) {
      const f = await secondFactors(event.locals.db, event.locals.user.id)
      if (!f.totp && !f.passkeys)
        redirect(303, "/account/settings/security?required=1")
      // Set up, but this session skipped it (opened before it was required): sign in again.
      await invalidateSession(event.locals.db, event.locals.session!.id)
      clearSessionCookie(event.cookies)
      redirect(303, `/login/sign_in?next=${encodeURIComponent(path)}`)
    }
  }
  return resolve(event)
}

// Public pages for visitors without a session are kept in Cloudflare's cache under the cache version,
// which every admin change bumps. Node sites rely on the cache-control header and any proxy in front.
const NOT_CACHED =
  /^\/(admin|account|login|auth|api|search|assistant|media|ticket|forms|help|newsletter|book|contact_us)(\/|$)|__data\.json$/
const edgeCache: Handle = async ({ event, resolve }) => {
  const cache = __CLOUDFLARE__
    ? (globalThis as { caches?: { default?: Cache } }).caches?.default
    : undefined
  if (
    !cache ||
    event.request.method !== "GET" ||
    event.cookies.get(SESSION_COOKIE) ||
    NOT_CACHED.test(splitLocale(event.url.pathname).path)
  )
    return resolve(event)
  const key = new URL(event.url)
  key.searchParams.set("__v", await cacheVersion(event.locals.db))
  const hit = await cache.match(key.toString())
  if (hit) {
    const res = new Response(hit.body, hit)
    res.headers.set("x-cache", "HIT")
    return res
  }
  const response = await resolve(event)
  const cc = response.headers.get("cache-control") ?? ""
  if (
    response.status === 200 &&
    (response.headers.get("content-type") ?? "").startsWith("text/html") &&
    !response.headers.has("set-cookie") &&
    !/private|no-store/.test(cc)
  ) {
    const stored = new Response(response.clone().body, response)
    stored.headers.set("cache-control", "public, s-maxage=3600")
    background(cache.put(key.toString(), stored))
    response.headers.set("x-cache", "MISS")
  }
  return response
}

// Old addresses go to their new place before any route runs; 404s are logged for the admin.
const redirects: Handle = async ({ event, resolve }) => {
  const method = event.request.method
  const path = event.url.pathname
  if (
    (method === "GET" || method === "HEAD") &&
    !path.startsWith("/admin") &&
    !path.startsWith("/_app")
  ) {
    const r = await findRedirect(event.locals.db, path, event.url.search)
    if (r) {
      background(countHit(event.locals.db, r.id))
      const keepQuery =
        r.to.startsWith("/") && !r.to.includes("?") && !r.from.includes("?")
      return new Response(null, {
        status: r.code,
        headers: { location: r.to + (keepQuery ? event.url.search : "") },
      })
    }
  }
  const response = await resolve(event)
  if (
    response.status === 404 &&
    method === "GET" &&
    !path.startsWith("/admin") &&
    !path.endsWith("__data.json")
  )
    background(
      logNotFound(event.locals.db, path, event.request.headers.get("referer")),
    )
  return response
}

// Any change saved in the admin can alter public pages, so it starts a new cache version.
const bumpOnAdminWrite: Handle = async ({ event, resolve }) => {
  const response = await resolve(event)
  if (
    event.request.method === "POST" &&
    event.url.pathname.startsWith("/admin") &&
    event.locals.user &&
    response.status < 400
  )
    background(bumpCacheVersion(event.locals.db))
  return response
}

// The page language in <html lang>, and right-to-left for Arabic and Hebrew.
const htmlLang: Handle = async ({ event, resolve }) => {
  const { locale } = splitLocale(event.url.pathname)
  const lang = locale ?? (await getSettings(event.locals.db)).i18n.defaultLocale
  if (lang === "en") return resolve(event)
  const dir = LOCALES[lang]?.rtl ? ' dir="rtl"' : ""
  return resolve(event, {
    transformPageChunk: ({ html }) =>
      html.replace('<html lang="en"', `<html lang="${lang}"${dir}`),
  })
}

export const handle: Handle = sequence(
  securityHeaders,
  database,
  edgeCache,
  redirects,
  modules,
  htmlLang,
  authGuard,
  adminGuard,
  bumpOnAdminWrite,
)
