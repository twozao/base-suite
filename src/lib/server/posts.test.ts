import { describe, it, expect } from "vitest"
import { createTestDb } from "./db/test_db"
import {
  countPublishedPosts,
  listPostCards,
  publishedTags,
  relatedPosts,
  searchPosts,
} from "./posts"

const seed = async () => {
  const db = await createTestDb()
  const post = (
    slug: string,
    title: string,
    tags: string[],
    published_at: string | null,
    status: "draft" | "published" = "published",
    body_md = "",
  ) => ({
    id: crypto.randomUUID(),
    slug,
    title,
    body_md,
    tags: JSON.stringify(tags),
    published_at,
    status,
  })
  await db
    .insertInto("posts")
    .values([
      post(
        "kysely-guide",
        "Kysely guide",
        ["svelte", "kysely"],
        "2026-01-01T00:00:00.000Z",
        "published",
        "Type-safe SQL",
      ),
      post(
        "svelte-tips",
        "Svelte tips",
        ["svelte"],
        "2026-02-01T00:00:00.000Z",
        "published",
        "Runes everywhere",
      ),
      post(
        "sveltekit-forms",
        "SvelteKit forms",
        ["sveltekit"],
        "2026-03-01T00:00:00.000Z",
      ),
      post("draft-post", "Draft post", ["unpublished"], null, "draft"),
      post("scheduled", "Scheduled", ["future"], "2999-01-01T00:00:00.000Z"),
    ])
    .execute()
  return db
}

describe("posts", () => {
  it("lists visible posts newest first with tags as arrays, and pages", async () => {
    const db = await seed()
    const all = await listPostCards(db, { limit: 10 })
    expect(all.map((p) => p.slug)).toEqual([
      "sveltekit-forms",
      "svelte-tips",
      "kysely-guide",
    ])
    expect(all[2].tags).toEqual(["svelte", "kysely"])
    expect(await countPublishedPosts(db)).toBe(3)
    const second = await listPostCards(db, { limit: 1, offset: 1 })
    expect(second.map((p) => p.slug)).toEqual(["svelte-tips"])
  })

  it("filters by an exact tag, not a prefix", async () => {
    const db = await seed()
    const tagged = await listPostCards(db, { tag: "svelte", limit: 10 })
    expect(tagged.map((p) => p.slug)).toEqual(["svelte-tips", "kysely-guide"])
    expect(await countPublishedPosts(db, { tag: "svelte" })).toBe(2)
    expect(await countPublishedPosts(db, { tag: "sveltekit" })).toBe(1)
  })

  it("collects tags from visible posts only", async () => {
    const db = await seed()
    expect(await publishedTags(db)).toEqual(["kysely", "svelte", "sveltekit"])
  })

  it("finds related posts by shared tag, falling back to newest", async () => {
    const db = await seed()
    const byTag = await relatedPosts(db, "kysely-guide", ["kysely", "svelte"])
    expect(byTag.map((p) => p.slug)).toEqual(["svelte-tips"])
    const newest = await relatedPosts(db, "kysely-guide", [], 2)
    expect(newest.map((p) => p.slug)).toEqual([
      "sveltekit-forms",
      "svelte-tips",
    ])
  })

  it("searches title and body case-insensitively over visible posts", async () => {
    const db = await seed()
    expect((await searchPosts(db, "RUNES")).map((p) => p.slug)).toEqual([
      "svelte-tips",
    ])
    expect((await searchPosts(db, "svelte")).map((p) => p.slug)).toEqual([
      "sveltekit-forms",
      "svelte-tips",
    ])
    expect(await searchPosts(db, "draft")).toEqual([])
    expect(await searchPosts(db, "100%")).toEqual([])
  })
})
