import { readFileSync } from "node:fs"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Db } from "../db"
import { createTestDb } from "../db/test_db"
import {
  importWxr,
  parseWxr,
  remoteImages,
  replaceImageUrl,
  wpContentToHtml,
} from "./wordpress"

vi.mock("$env/dynamic/private", () => ({
  env: { PRIVATE_SECRETS_KEY: "test-key-material" },
}))

const xml = readFileSync(
  new URL("./fixtures/wordpress.xml", import.meta.url),
  "utf8",
)
let db: Db
beforeEach(async () => {
  db = await createTestDb()
})

describe("WordPress import", () => {
  it("refuses files that are not WordPress exports or carry entities", () => {
    expect(parseWxr("<rss><channel></channel></rss>")).toHaveProperty("error")
    expect(
      parseWxr('<?xml version="1.0"?><!DOCTYPE x [<!ENTITY a "aaaa">]><rss/>'),
    ).toHaveProperty("error")
  })
  it("wraps classic paragraphs and drops shortcodes", () => {
    expect(wpContentToHtml("One\n\nTwo\nlines [gallery ids=1]")).toBe(
      "<p>One</p>\n<p>Two<br>lines</p>",
    )
  })
  it("imports posts, pages and custom types with redirects, and is safe to run twice", async () => {
    const parsed = parseWxr(xml)
    if ("error" in parsed) throw new Error(parsed.error)
    expect(parsed.origin).toBe("https://old.example.com")
    const counts = await importWxr(db, parsed, null)
    expect(counts).toMatchObject({
      posts: 1,
      pages: 2,
      entries: 1,
      types: 1,
      skipped: 0,
    })
    const post = await db
      .selectFrom("posts")
      .selectAll()
      .where("slug", "=", "hello-world")
      .executeTakeFirstOrThrow()
    expect(post.status).toBe("published")
    expect(post.author_name).toBe("Maya Lin")
    expect(JSON.parse(post.tags)).toEqual(["news", "design tips"])
    expect(post.seo_description).toBe("Our first post")
    expect(post.cover_image_url).toBe(
      "https://old.example.com/wp-content/uploads/2023/05/cat.jpg",
    )
    expect(post.body_html).toContain("First post")
    expect(post.body_html).not.toContain("script")
    const draft = await db
      .selectFrom("cms_pages")
      .select("status")
      .where("slug", "=", "contact-page")
      .executeTakeFirstOrThrow()
    expect(draft.status).toBe("draft")
    const redirects = (
      await db.selectFrom("redirects").select(["from_path", "to_url"]).execute()
    ).sort((a, b) => (a.from_path < b.from_path ? -1 : 1))
    expect(redirects).toEqual([
      { from_path: "/2023/05/hello-world", to_url: "/blog/hello-world" },
      {
        from_path: "/?portfolio=acme-rebuild",
        to_url: "/portfolio/acme-rebuild",
      },
    ])
    const again = await importWxr(db, parsed, null)
    expect(again).toMatchObject({ posts: 0, pages: 0, entries: 0, skipped: 4 })
  })
  it("finds old-site images and points content at the copies", async () => {
    const parsed = parseWxr(xml)
    if ("error" in parsed) throw new Error(parsed.error)
    await importWxr(db, parsed, null)
    const urls = await remoteImages(db, parsed.origin)
    expect(urls).toEqual([
      "https://old.example.com/wp-content/uploads/2023/05/cat.jpg",
    ])
    await replaceImageUrl(db, urls[0], "/media/1700000000000-abcdefgh-cat.jpg")
    const post = await db
      .selectFrom("posts")
      .select(["body_html", "cover_image_url"])
      .executeTakeFirstOrThrow()
    expect(post.cover_image_url).toBe("/media/1700000000000-abcdefgh-cat.jpg")
    expect(post.body_html).toContain(
      'src="/media/1700000000000-abcdefgh-cat.jpg"',
    )
  })
})
