import type { Db } from "$lib/server/db"
import type { SessionInfo, SessionUser } from "$lib/server/auth/session"
import type { StaffContext } from "$lib/server/auth/staff"

declare global {
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
    // interface Platform {}
  }
}

export {}
