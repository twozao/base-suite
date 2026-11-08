import { describe, it, expect, beforeEach } from "vitest"
import { createTestDb } from "./test_db"
import { applySeedProfile, seedSampleContent } from "./seed"
import { SEED_PROFILES, seedProfileIds } from "./profiles"
import { getSettings, invalidateSettings } from "../settings"
import { THEMES } from "../theme"
import { existsSync } from "node:fs"

beforeEach(() => invalidateSettings())

describe("seed profiles", () => {
  it("rejects an unknown profile", async () => {
    const db = await createTestDb()
    await expect(applySeedProfile(db, "nope")).rejects.toThrow(
      /unknown profile/,
    )
  })

  for (const id of seedProfileIds()) {
    it(`applies ${id}: settings validate, pages and posts replace the defaults`, async () => {
      const db = await createTestDb()
      await seedSampleContent(db)
      const written = await applySeedProfile(db, id)
      const profile = SEED_PROFILES[id]
      const s = await getSettings(db)
      expect(s.brand.siteName).toBe(profile.settings.brand?.siteName)
      expect(THEMES[s.brand.theme]).toBeDefined()
      const pages = await db
        .selectFrom("cms_pages")
        .select(["slug", "body_html", "status"])
        .execute()
      const posts = await db
        .selectFrom("posts")
        .select(["slug", "body_html", "author_name", "tags"])
        .execute()
      expect(pages.map((p) => p.slug).sort()).toEqual(
        profile.pages.map((p) => p.slug).sort(),
      )
      expect(posts.map((p) => p.slug).sort()).toEqual(
        profile.posts.map((p) => p.slug).sort(),
      )
      for (const row of [...pages, ...posts])
        expect(row.body_html).toMatch(/<(p|h2)>/)
      for (const post of posts) {
        expect(post.author_name).toBe(profile.authorName)
        expect(JSON.parse(post.tags).length).toBeGreaterThan(0)
      }
      expect(written.length).toBe(
        Object.keys(profile.settings).length +
          profile.pages.length +
          profile.posts.length +
          profile.eventTypes.length,
      )
    })
  }

  it("links only to pages, posts and routes that exist, and ships every image it references", () => {
    const routes = new Set([
      "/",
      "/blog",
      "/blog/rss.xml",
      "/contact_us",
      "/book",
      "/pricing",
      "/newsletter",
      "/search",
      "/login/sign_up",
      "/login/sign_in",
      "/account",
    ])
    for (const profile of Object.values(SEED_PROFILES)) {
      const known = new Set(routes)
      for (const p of profile.pages) known.add(`/${p.slug}`)
      for (const p of profile.posts) known.add(`/blog/${p.slug}`)
      const text = JSON.stringify(profile)
      const links = [...text.matchAll(/\]\((\/[^)\s]*)\)/g)].map((m) => m[1])
      const hrefs = [...text.matchAll(/"href":"(\/[^"#]*)/g)].map((m) => m[1])
      for (const href of [...links, ...hrefs]) {
        const path = href.split("#")[0]
        if (path.startsWith("/samples/")) continue
        expect(known.has(path), `${profile.id} links to ${href}`).toBe(true)
      }
      const images = [...text.matchAll(/(\/samples\/[a-z0-9/_.-]+\.png)/g)].map(
        (m) => m[1],
      )
      expect(images.length).toBeGreaterThan(3)
      for (const img of new Set(images))
        expect(
          existsSync(`static${img}`),
          `${profile.id} is missing ${img}`,
        ).toBe(true)
    }
  })

  it("keeps every profile ASCII-only and every menu link internal or https", () => {
    for (const profile of Object.values(SEED_PROFILES)) {
      const text = JSON.stringify(profile)
      expect([...text].every((ch) => ch.charCodeAt(0) < 128)).toBe(true)
      for (const link of profile.settings.navigation?.header ?? [])
        expect(link.href).toMatch(/^(\/|https:\/\/)/)
    }
  })
})
