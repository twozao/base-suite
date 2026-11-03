// Public site configuration shared with every page (from the root layout).
import type { z } from "zod"
import type { brandSchema, navigationSchema } from "$lib/server/content_schema"

export type Brand = z.output<typeof brandSchema>
export type Navigation = z.output<typeof navigationSchema>

export type PublicSite = {
  brand: Brand
  navigation: Navigation
  announcement: string
  themeCss: string
  modules: {
    chat: boolean
    booking: boolean
    contact: boolean
    subscriptions: boolean
    cms: boolean
    newsletter: boolean
    analytics: boolean
    crm: boolean
  }
}
