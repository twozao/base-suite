import { env } from "$env/dynamic/private"
import { error, redirect, type Handle, type ServerInit } from "@sveltejs/kit"
import { sequence } from "@sveltejs/kit/hooks"
import { connect, connectD1, type Db } from "$lib/server/db"
import { setBindings } from "$lib/server/platform"
import {
  SESSION_COOKIE,
  clearSessionCookie,
  setSessionCookie,
  validateSession,
} from "$lib/server/auth/session"
import { getStaff } from "$lib/server/auth/staff"
import { getSettings } from "$lib/server/settings"
import { setModuleSwitches } from "$lib/modules"
import { sendDueReminders } from "$lib/server/booking/notify"

const REMINDER_POLL_MS = 5 * 60_000

let db: Db

// One database handle per process, migrated to the latest schema before the first request. On
// Cloudflare the D1 binding arrives with each request instead, and a Cron Trigger sends reminders.
export const init: ServerInit = async () => {
  if (__CLOUDFLARE__) return
  db = (await connect(env.DATABASE_URL ?? "")).db
  // Hosts that freeze idle processes send reminders late; each one is still only sent once.
  const remind = () =>
    sendDueReminders(db).catch((e) =>
      console.error("reminders failed", e instanceof Error ? e.message : e),
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
  }
  return resolve(event)
}

export const handle: Handle = sequence(
  securityHeaders,
  database,
  modules,
  authGuard,
  adminGuard,
)
