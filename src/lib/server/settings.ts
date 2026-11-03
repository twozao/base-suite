import { z } from "zod"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database, Json } from "../../DatabaseDefinitions"
import {
  brandSchema,
  navigationSchema,
  homeSchema,
  pricingSchema,
  DEFAULT_BRAND,
  DEFAULT_NAVIGATION,
  DEFAULT_HOME,
  DEFAULT_PRICING,
} from "./content_schema"

// Every runtime-editable setting is declared here with a schema and default.
// Unknown keys in the database are ignored; invalid values fall back to the
// default, so a bad row can never break the site.

const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .url()
  .refine((u) => u.startsWith("https://"), "Must be an https:// URL")

export const calendlyUrl = httpsUrl.refine(
  (u) => /^https:\/\/calendly\.com\/[A-Za-z0-9._~\-/]+$/.test(u),
  "Must be a calendly.com scheduling link",
)

export const settingsSchema = {
  brand: brandSchema.default(DEFAULT_BRAND),
  navigation: navigationSchema.default(DEFAULT_NAVIGATION),
  home: homeSchema.default(DEFAULT_HOME),
  pricing: pricingSchema.default(DEFAULT_PRICING),
  general: z
    .object({
      supportEmail: z.string().trim().email().max(320).or(z.literal("")),
      announcement: z.string().trim().max(300),
    })
    .default({ supportEmail: "", announcement: "" }),
  chat: z
    .object({
      enabled: z.boolean(),
      greeting: z.string().trim().min(1).max(300),
      offlineMessage: z.string().trim().max(300),
      requireEmail: z.boolean(),
      notifyAdminOnNew: z.boolean(),
    })
    .default({
      enabled: true,
      greeting: "Hi! How can we help? We usually reply within a few hours.",
      offlineMessage: "",
      requireEmail: true,
      notifyAdminOnNew: true,
    }),
  booking: z
    .object({
      enabled: z.boolean(),
      intro: z.string().trim().max(500),
      eventTypes: z
        .array(
          z.object({
            label: z.string().trim().min(1).max(100),
            description: z.string().trim().max(300),
            durationMinutes: z.number().int().min(5).max(480),
            url: calendlyUrl,
          }),
        )
        .max(12),
    })
    .default({
      enabled: true,
      intro: "Pick a time that works for you.",
      eventTypes: [],
    }),
  contact: z
    .object({
      notifyAdmin: z.boolean(),
      successMessage: z.string().trim().min(1).max(300),
    })
    .default({
      notifyAdmin: true,
      successMessage: "Thanks! We'll get back to you soon.",
    }),
}

export type SettingKey = keyof typeof settingsSchema
export type Settings = {
  [K in SettingKey]: z.output<(typeof settingsSchema)[K]>
}

const defaults = (): Settings =>
  Object.fromEntries(
    Object.entries(settingsSchema).map(([k, schema]) => [
      k,
      schema.parse(undefined),
    ]),
  ) as Settings

// Per-instance cache. Settings change rarely; a short TTL keeps every request
// from hitting the database while edits still show up within seconds.
const TTL_MS = 30_000
let cache: { at: number; value: Settings } | null = null

export const invalidateSettings = () => {
  cache = null
}

export const getSettings = async (
  supabaseServiceRole: SupabaseClient<Database>,
): Promise<Settings> => {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value
  const result = defaults()
  const { data, error } = await supabaseServiceRole
    .from("site_settings")
    .select("key, value")
  if (error) {
    console.error("Failed to load settings, using defaults", error.message)
    return result
  }
  for (const row of data ?? []) {
    if (!(row.key in settingsSchema)) continue
    const key = row.key as SettingKey
    const parsed = settingsSchema[key].safeParse(row.value)
    if (parsed.success) {
      ;(result as Record<SettingKey, unknown>)[key] = parsed.data
    } else {
      console.warn("Invalid stored setting, using default:", key)
    }
  }
  cache = { at: Date.now(), value: result }
  return result
}

export const saveSetting = async <K extends SettingKey>(
  supabaseServiceRole: SupabaseClient<Database>,
  key: K,
  value: Settings[K],
  userId: string,
) => {
  const parsed = settingsSchema[key].parse(value)
  const { error } = await supabaseServiceRole.from("site_settings").upsert({
    key,
    value: parsed as Json,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  })
  invalidateSettings()
  return { error }
}
