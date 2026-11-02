import { Session, SupabaseClient, type AMREntry } from "@supabase/supabase-js"
import { Database } from "./DatabaseDefinitions"
import type { StaffContext } from "$lib/server/auth/staff"

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>
      supabaseServiceRole: SupabaseClient<Database>
      safeGetSession: () => Promise<{
        session: Session | null
        user: User | null
        amr: AMREntry[] | null
      }>
      session: Session | null
      user: User | null
      /** Memoised by getStaff(); undefined until first looked up. */
      staff?: StaffContext | null
    }
    interface PageData {
      session?: Session | null
    }
    // interface Error {}
    // interface Platform {}
  }
}

export {}
