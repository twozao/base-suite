import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "../../../DatabaseDefinitions"

export type RateLimitRule = { windowSeconds: number; max: number }

export const RATE_LIMITS = {
  contactForm: { windowSeconds: 600, max: 5 },
  chatStart: { windowSeconds: 3600, max: 10 },
  chatMessage: { windowSeconds: 60, max: 20 },
  chatPoll: { windowSeconds: 60, max: 120 },
} satisfies Record<string, RateLimitRule>

/**
 * Database-backed fixed-window rate limit, so limits hold across serverless
 * instances. Fails open (allows the request) if the database call errors,
 * trading strictness for availability; the error is logged.
 */
export const rateLimit = async (
  supabaseServiceRole: SupabaseClient<Database>,
  key: string,
  rule: RateLimitRule,
): Promise<boolean> => {
  const { data, error } = await supabaseServiceRole.rpc("rate_limit_hit", {
    p_key: key.slice(0, 200),
    p_window_seconds: rule.windowSeconds,
    p_max: rule.max,
  })
  if (error) {
    console.error("rate_limit_hit failed", error.message)
    return true
  }
  return data === true
}
