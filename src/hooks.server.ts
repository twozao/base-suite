import { env } from "$env/dynamic/private"
import { error, redirect, type Handle, type ServerInit } from "@sveltejs/kit"
import { sequence } from "@sveltejs/kit/hooks"
import { connect, type Db } from "$lib/server/db"
import {
  SESSION_COOKIE,
  clearSessionCookie,
  setSessionCookie,
  validateSession,
} from "$lib/server/auth/session"
import { getStaff } from "$lib/server/auth/staff"
import { getSettings } from "$lib/server/settings"
import { setModuleSwitches } from "$lib/modules"

let db: Db

// One database handle per process, migrated to the latest schema before the first request.
export const init: ServerInit = async () => {
  db = (await connect(env.DATABASE_URL ?? "")).db
}

const database: Handle = async ({ event, resolve }) => {
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
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
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
