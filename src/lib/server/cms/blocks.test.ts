import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Db } from "../db"
import { createTestDb } from "../db/test_db"
import { renderBlocks } from "./blocks"
import { bodyFrom, rerenderUsing } from "./content"

vi.mock("$env/dynamic/private", () => ({
  env: { PRIVATE_SECRETS_KEY: "test-key-material" },
}))

let db: Db
beforeEach(async () => {
  db = await createTestDb()
})

describe("block rendering", () => {
  it("removes scripts and unknown iframes from HTML blocks", async () => {
    const html = await renderBlocks(db, [
      {
        type: "html",
        html: '<p onclick="x()">Hi</p><script>alert(1)</script><iframe src="https://evil.example"></iframe><img src="x" onerror="alert(1)">',
      },
    ])
    expect(html).toContain("<p>Hi</p>")
    expect(html).not.toMatch(/script|onclick|onerror|evil\.example/)
  })
  it("keeps YouTube players and escapes text", async () => {
    const html = await renderBlocks(db, [
      { type: "embed", url: "https://youtu.be/dQw4w9WgXcQ", title: "Demo" },
      { type: "heading", level: 2, text: "<b>Prices</b>", anchor: "prices" },
    ])
    expect(html).toContain(
      'src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"',
    )
    expect(html).toContain('<h2 id="prices">&lt;b&gt;Prices&lt;/b&gt;</h2>')
  })
  it("adds srcset for media with resized copies", async () => {
    const name = "1700000000000-abcdefgh-cat.jpg"
    await db
      .insertInto("media")
      .values({ name, width: 2000, height: 1000, variants: "[480,960]" })
      .execute()
    const html = await renderBlocks(db, [
      {
        type: "image",
        src: `/media/${name}`,
        alt: "A cat",
        caption: "",
        decorative: false,
        wide: false,
      },
    ])
    expect(html).toContain("1700000000000-abcdefgh-cat-w480.webp 480w")
    expect(html).toContain(`/media/${name} 2000w`)
    expect(html).toContain('alt="A cat"')
  })
  it("renders reusable blocks, updates their pages, and ignores loops", async () => {
    await db
      .insertInto("cms_blocks")
      .values({
        id: "b1",
        name: "CTA",
        blocks_json: JSON.stringify([
          { type: "markdown", md: "Call us" },
          { type: "reusable", ref: "b1" },
        ]),
      })
      .execute()
    const body = await bodyFrom(db, [{ type: "reusable", ref: "b1" }])
    expect(body.body_html).toContain("Call us")
    await db
      .insertInto("cms_pages")
      .values({ id: "p1", slug: "home-page", title: "Home", ...body })
      .execute()
    await db
      .updateTable("cms_blocks")
      .set({
        blocks_json: JSON.stringify([{ type: "markdown", md: "Write to us" }]),
      })
      .execute()
    expect(await rerenderUsing(db, "b1")).toBe(1)
    const page = await db
      .selectFrom("cms_pages")
      .select("body_html")
      .where("id", "=", "p1")
      .executeTakeFirstOrThrow()
    expect(page.body_html).toContain("Write to us")
  })
})
