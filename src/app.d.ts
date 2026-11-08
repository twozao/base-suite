import type { Db } from "$lib/server/db"
import type { SessionInfo, SessionUser } from "$lib/server/auth/session"
import type { StaffContext } from "$lib/server/auth/staff"

declare global {
  /** True in the Cloudflare build. Vite replaces it, so code for the other platform is left out. */
  const __CLOUDFLARE__: boolean
  namespace App {
    interface Locals {
      db: Db
      user: SessionUser | null
      session: SessionInfo | null
      /** Memoised by getStaff(); undefined until first looked up. */
      staff?: StaffContext | null
    }
    // interface PageData {}
    // interface Error {}
    interface Platform {
      env: import("$lib/server/platform").Bindings & Record<string, unknown>
      ctx: import("@cloudflare/workers-types").ExecutionContext
    }
  }
}

export {}
