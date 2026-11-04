import { describe, it, expect } from "vitest"
import { createTestDb } from "../db/test_db"
import { isCmsStatus, publishedPage, searchPages, slugify } from "./pages"

const seed = async () => {
  const db = await createTestDb()
  await db
    .insertInto("cms_pages")
    .values([
      {
        id: crypto.randomUUID(),
        slug: "about",
        title: "About us",
        body_md: "We build things",
        body_html: "<p>We build things</p>",
        status: "published",
      },
      {
        id: crypto.randomUUID(),
        slug: "hidden",
        title: "Hidden about page",
        body_md: "Not yet",
        body_html: "<p>Not yet</p>",
        status: "draft",
      },
      {
        id: crypto.randomUUID(),
        slug: "old",
        title: "Old page",
        body_md: "Gone",
        body_html: "<p>Gone</p>",
        status: "archived",
      },
    ])
    .execute()
  return db
}

describe("cms pages", () => {
  it("serves only published pages", async () => {
    const db = await seed()
    expect((await publishedPage(db, "about"))?.body_html).toBe(
      "<p>We build things</p>",
    )
    expect(await publishedPage(db, "hidden")).toBeUndefined()
    expect(await publishedPage(db, "old")).toBeUndefined()
    expect(await publishedPage(db, "missing")).toBeUndefined()
  })

  it("searches published pages case-insensitively", async () => {
    const db = await seed()
    expect((await searchPages(db, "ABOUT")).map((p) => p.slug)).toEqual([
      "about",
    ])
    expect((await searchPages(db, "build")).map((p) => p.slug)).toEqual([
      "about",
    ])
    expect(await searchPages(db, "gone")).toEqual([])
  })

  it("slugifies titles and narrows status filters", () => {
    expect(slugify("Hello, World!")).toBe("hello-world")
    expect(slugify("Cafe au lait")).toBe("cafe-au-lait")
    expect(isCmsStatus("draft")).toBe(true)
    expect(isCmsStatus("all")).toBe(false)
  })
})
