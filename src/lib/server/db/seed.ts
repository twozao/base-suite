import type { Db } from "./index"
import { renderMarkdown } from "../cms/markdown"
import { saveSetting, type SettingKey } from "../settings"
import { toRow, type EventTypeInput } from "../booking/event_types"
import { SEED_PROFILES, type SeedProfile } from "./profiles"

// Sample content for a fresh install: three posts and an About page, rendered through the same
// Markdown sanitiser the admin uses. Inserts only when the tables are empty, so it is safe to rerun.
const daysAgo = (n: number) =>
  new Date(Date.now() - n * 86_400_000).toISOString()

const POSTS = [
  {
    slug: "welcome-to-base-suite",
    title: "Welcome to Base Suite",
    excerpt:
      "Your website, customers and support in one place. Here is a quick tour of what you can do from the admin portal.",
    tags: ["news", "product"],
    days: 2,
    md: `Base Suite gives your business a fast website **and** the tools to run it.

## What is inside

- **Pages and blog**: write in Markdown, preview, publish.
- **Live chat**: answer visitors from one inbox.
- **Booking**: let customers pick a time with Calendly.
- **Subscriptions**: sell plans with Stripe.

## Make it yours

Open **Admin > Brand and navigation** to set your name, logo and colours, then **Admin > Homepage** to rewrite this site's copy. Everything updates instantly, with no code and no redeploys.

> Tip: delete this post from **Admin > Blog** once you have written your own.`,
  },
  {
    slug: "five-tips-for-a-homepage-that-converts",
    title: "5 tips for a homepage that converts",
    excerpt:
      "Small changes that make visitors stay, trust you and take the next step.",
    tags: ["guides", "marketing"],
    days: 9,
    md: `Your homepage has one job: help the right visitor take the next step.

1. **Say what you do in one sentence.** Put it in the hero title.
2. **Show proof early.** A stats bar or two testimonials go a long way.
3. **One primary action.** Make it obvious: "Book a demo" or "Get started".
4. **Answer objections.** An FAQ section handles the questions people will not ask.
5. **Make it fast.** Every second of load time costs you visitors.

All five are built into the homepage editor. Try reordering your features so the most important one comes first.`,
  },
  {
    slug: "how-we-handle-your-data",
    title: "How we handle your data",
    excerpt:
      "Security is not an add-on. Here is how your information is protected.",
    tags: ["security"],
    days: 20,
    md: `We take your data seriously. A few things we do by default:

- Your data lives in **your own database**, on your own server.
- Staff access is **role-based** and every admin change is **audit-logged**.
- Payments are handled by **Stripe**, so card details never touch our servers.
- The site loads **no third-party tracking scripts**.

Questions? [Get in touch](/contact_us).`,
  },
]

const ABOUT = {
  slug: "about",
  title: "About us",
  excerpt: "Who we are and how we work.",
  md: `We help small businesses look great online and stay close to their customers.

## Our story

Started by a small team who were tired of stitching together five tools to run one website.

## Get in touch

Use the chat button, [book a call](/book) or [send us a message](/contact_us).`,
}

const insertEventTypes = async (db: Db, types: EventTypeInput[]) => {
  let sort_order = 0
  for (const t of types) {
    await db
      .insertInto("booking_event_types")
      .values({
        id: crypto.randomUUID(),
        ...toRow(t),
        sort_order: sort_order++,
      })
      .execute()
  }
}

const DEFAULT_EVENT_TYPE: EventTypeInput = {
  name: "30 minute call",
  slug: "30-minute-call",
  description: "A short call to talk through what you need.",
  durationMinutes: 30,
  locationKind: "video",
  locationDetail: "",
  bufferBefore: 0,
  bufferAfter: 0,
  minNoticeMinutes: 240,
  maxDaysAhead: 60,
  slotInterval: 30,
  dailyLimit: null,
  active: true,
  questions: [],
}

export const seedSampleContent = async (db: Db) => {
  const added: string[] = []
  const types = await db
    .selectFrom("booking_event_types")
    .select("id")
    .limit(1)
    .execute()
  if (!types.length) {
    await insertEventTypes(db, [DEFAULT_EVENT_TYPE])
    added.push(`event type ${DEFAULT_EVENT_TYPE.slug}`)
  }
  const posts = await db.selectFrom("posts").select("id").limit(1).execute()
  if (!posts.length) {
    for (const p of POSTS) {
      await db
        .insertInto("posts")
        .values({
          id: crypto.randomUUID(),
          slug: p.slug,
          title: p.title,
          excerpt: p.excerpt,
          body_md: p.md,
          body_html: renderMarkdown(p.md),
          author_name: "The Base Suite team",
          tags: JSON.stringify(p.tags),
          status: "published",
          published_at: daysAgo(p.days),
        })
        .execute()
      added.push(`post ${p.slug}`)
    }
  }
  const pages = await db.selectFrom("cms_pages").select("id").limit(1).execute()
  if (!pages.length) {
    await db
      .insertInto("cms_pages")
      .values({
        id: crypto.randomUUID(),
        slug: ABOUT.slug,
        title: ABOUT.title,
        excerpt: ABOUT.excerpt,
        body_md: ABOUT.md,
        body_html: renderMarkdown(ABOUT.md),
        status: "published",
        published_at: daysAgo(0),
      })
      .execute()
    added.push(`page ${ABOUT.slug}`)
  }
  return added
}

/**
 * Replace the sample site with a profile: settings (brand, menus, homepage, module switches), pages
 * and posts. Existing pages, posts and their revisions are removed first; accounts, chats, bookings
 * and CRM data are untouched. Returns what was written.
 */
export const applySeedProfile = async (db: Db, profileId: string) => {
  const profile: SeedProfile | undefined = SEED_PROFILES[profileId]
  if (!profile)
    throw new Error(
      `unknown profile "${profileId}"; choose one of ${Object.keys(SEED_PROFILES).join(", ")}`,
    )
  const written: string[] = []
  for (const [key, value] of Object.entries(profile.settings)) {
    await saveSetting(db, key as SettingKey, value as never, null)
    written.push(`setting ${key}`)
  }
  await db.deleteFrom("booking_event_types").execute()
  await insertEventTypes(db, profile.eventTypes)
  written.push(...profile.eventTypes.map((t) => `event type ${t.slug}`))
  await db.deleteFrom("cms_page_revisions").execute()
  await db.deleteFrom("cms_pages").execute()
  await db.deleteFrom("posts").execute()
  for (const p of profile.pages) {
    await db
      .insertInto("cms_pages")
      .values({
        id: crypto.randomUUID(),
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        seo_title: p.seoTitle ?? null,
        seo_description: p.excerpt,
        body_md: p.md,
        body_html: renderMarkdown(p.md),
        status: "published",
        published_at: daysAgo(0),
      })
      .execute()
    written.push(`page ${p.slug}`)
  }
  for (const p of profile.posts) {
    await db
      .insertInto("posts")
      .values({
        id: crypto.randomUUID(),
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        seo_description: p.excerpt,
        cover_image_url: p.cover ?? null,
        body_md: p.md,
        body_html: renderMarkdown(p.md),
        author_name: profile.authorName,
        tags: JSON.stringify(p.tags),
        status: "published",
        published_at: daysAgo(p.days),
      })
      .execute()
    written.push(`post ${p.slug}`)
  }
  return written
}
