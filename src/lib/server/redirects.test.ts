import { beforeEach, describe, expect, it } from "vitest"
import type { Db } from "./db"
import { createTestDb } from "./db/test_db"
import {
  findRedirect,
  fromPathSchema,
  invalidateRedirects,
  logNotFound,
} from "./redirects"

let db: Db
beforeEach(async () => {
  db = await createTestDb()
  invalidateRedirects()
})

describe("redirects", () => {
  it("matches exact paths, trailing slashes and whole sections", async () => {
    await db
      .insertInto("redirects")
      .values([
        { from_path: "/old", to_url: "/new", status_code: 301 },
        { from_path: "/docs/*", to_url: "/help/*", status_code: 302 },
      ])
      .execute()
    expect((await findRedirect(db, "/old/"))?.to).toBe("/new")
    expect((await findRedirect(db, "/docs/a/b"))?.to).toBe("/help/a/b")
    expect((await findRedirect(db, "/docs"))?.code).toBe(302)
    expect(await findRedirect(db, "/other")).toBeNull()
  })
  it("refuses admin and protocol-relative sources", () => {
    expect(fromPathSchema.safeParse("/admin/x").success).toBe(false)
    expect(fromPathSchema.safeParse("//evil").success).toBe(false)
    expect(fromPathSchema.safeParse("/2023/05/hello").success).toBe(true)
  })
  it("counts 404s but skips bots probing for WordPress files", async () => {
    await logNotFound(db, "/missing", null)
    await logNotFound(db, "/missing", "https://ref.test/")
    await logNotFound(db, "/wp-login.php", null)
    const rows = await db.selectFrom("not_found_log").selectAll().execute()
    expect(rows).toHaveLength(1)
    expect(rows[0].hits).toBe(2)
  })
})

describe("query redirects", () => {
  it("matches plain WordPress permalinks with their query", async () => {
    const db2 = await createTestDb()
    invalidateRedirects()
    await db2
      .insertInto("redirects")
      .values({ from_path: "/?p=12", to_url: "/blog/hello", status_code: 301 })
      .execute()
    expect((await findRedirect(db2, "/", "?p=12"))?.to).toBe("/blog/hello")
    expect(await findRedirect(db2, "/", "?p=13")).toBeNull()
  })
})
