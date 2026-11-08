import type { EventTypeInput } from "../../booking/event_types"
import type { Settings } from "../../settings"

// A seed profile is a complete sample site for one kind of business: theme and brand, menus,
// homepage sections, module switches, pages and blog posts. Applied by `npm run db:seed -- <id>`.
export type SeedPage = {
  slug: string
  title: string
  /** Shown under the title as the lead paragraph and used as the meta description. */
  excerpt: string
  seoTitle?: string
  md: string
}

export type SeedPost = {
  slug: string
  title: string
  excerpt: string
  tags: string[]
  /** Published this many days before the seed ran, so the blog has a timeline. */
  days: number
  /** Site path or https URL for the card and social image. */
  cover?: string
  md: string
}

export type SeedProfile = {
  id: string
  label: string
  summary: string
  authorName: string
  settings: Partial<
    Pick<
      Settings,
      | "brand"
      | "navigation"
      | "home"
      | "pricing"
      | "general"
      | "chat"
      | "booking"
      | "contact"
      | "blog"
      | "availability"
      | "modules"
    >
  >
  /** Replaces the event types offered at /book. Existing bookings are kept. */
  eventTypes: EventTypeInput[]
  pages: SeedPage[]
  posts: SeedPost[]
}
