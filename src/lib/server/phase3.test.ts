import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Db } from "./db"
import { createTestDb } from "./db/test_db"
import { exportSite, restoreSite } from "./backup"
import { approvedComments, commentsOpen, isSpammy } from "./comments"
import { getSettings, invalidateSettings, saveSetting } from "./settings"
import { localeFor, translateNavigation } from "./translations"
import { setModuleSwitches } from "$lib/modules"
import { reroute } from "../../hooks"

vi.mock("$env/dynamic/private", () => ({
  env: { PRIVATE_SECRETS_KEY: "test-key-material" },
}))
vi.mock("$env/dynamic/public", () => ({ env: {} }))

let db: Db
beforeEach(async () => {
  db = await createTestDb()
  invalidateSettings()
})

describe("comments", () => {
  it("close after the set number of days and catch link spam", () => {
    const now = Date.parse("2026-03-01T00:00:00Z")
    expect(
      commentsOpen(
        { enabled: true, closeAfterDays: 30 },
        "2026-02-15T00:00:00Z",
        now,
      ),
    ).toBe(true)
    expect(
      commentsOpen(
        { enabled: true, closeAfterDays: 10 },
        "2026-02-15T00:00:00Z",
        now,
      ),
    ).toBe(false)
    expect(commentsOpen({ enabled: false, closeAfterDays: 0 }, null, now)).toBe(
      false,
    )
    expect(isSpammy("see https://a.test https://b.test https://c.test")).toBe(
      true,
    )
    expect(isSpammy("one link https://a.test")).toBe(false)
  })
  it("show only approved comments, with replies under their parent", async () => {
    await db
      .insertInto("posts")
      .values({ id: "p1", slug: "p", title: "P", status: "published" })
      .execute()
    const a = await db
      .insertInto("comments")
      .values({
        post_id: "p1",
        author_name: "A",
        body: "First",
        status: "approved",
      })
      .returning("id")
      .executeTakeFirstOrThrow()
    await db
      .insertInto("comments")
      .values([
        {
          post_id: "p1",
          author_name: "B",
          body: "Reply",
          status: "approved",
          parent_id: Number(a.id),
        },
        { post_id: "p1", author_name: "C", body: "Waiting", status: "pending" },
        { post_id: "p1", author_name: "D", body: "Buy now", status: "spam" },
      ])
      .execute()
    const list = await approvedComments(db, "p1")
    expect(list).toHaveLength(1)
    expect(list[0].replies.map((r) => r.body)).toEqual(["Reply"])
  })
})

describe("backup", () => {
  it("leaves out accounts and secrets, and restores content", async () => {
    await db
      .insertInto("users")
      .values({
        id: "u1",
        email: "a@x.test",
        password_hash: "secret-hash",
      } as never)
      .execute()
    await db
      .insertInto("cms_pages")
      .values({
        id: "pg1",
        slug: "about",
        title: "About",
        body_html: "<p>Hi</p>",
        created_by: "u1",
      })
      .execute()
    await db
      .insertInto("site_settings")
      .values({
        key: "oauth_secrets",
        value: '{"google":"sealed"}',
        updated_by: null,
      })
      .execute()
    await saveSetting(
      db,
      "comments",
      {
        enabled: true,
        requireApproval: true,
        closeAfterDays: 0,
        notifyAdmin: false,
      },
      null,
    )
    const dump = await exportSite(db)
    const text = JSON.stringify(dump)
    expect(text).not.toContain("secret-hash")
    expect(text).not.toContain("oauth_secrets")
    expect(text).toContain('"slug":"about"')
    const fresh = await createTestDb()
    invalidateSettings()
    const r = await restoreSite(fresh, text)
    expect(r).toMatchObject({ ok: true })
    const page = await fresh
      .selectFrom("cms_pages")
      .selectAll()
      .executeTakeFirstOrThrow()
    expect(page).toMatchObject({ slug: "about", created_by: null })
    expect((await getSettings(fresh)).comments.enabled).toBe(true)
    expect(await restoreSite(fresh, '{"format":"other"}')).toHaveProperty(
      "error",
    )
  })
})

describe("translations", () => {
  it("routes /fr/about to /about and only for offered languages", async () => {
    expect(reroute({ url: new URL("https://x.test/fr/about") } as never)).toBe(
      "/about",
    )
    expect(
      reroute({ url: new URL("https://x.test/admin/fr") } as never),
    ).toBeUndefined()
    setModuleSwitches({ i18n: true, cms: true })
    expect(await localeFor(db, new URL("https://x.test/fr/about"))).toBeNull()
    await saveSetting(
      db,
      "i18n",
      { defaultLocale: "en", locales: ["en", "fr"] },
      null,
    )
    const fr = await localeFor(db, new URL("https://x.test/fr/about"))
    expect(fr).toMatchObject({ locale: "fr", active: true })
    expect(await localeFor(db, new URL("https://x.test/de/about"))).toBeNull()
    expect(await localeFor(db, new URL("https://x.test/en/about"))).toBeNull()
  })
  it("translates menu labels and keeps links in the language", () => {
    const nav = translateNavigation(
      {
        header: [
          { label: "About", href: "/about" },
          { label: "Docs", href: "https://docs.test" },
        ],
        ctaLabel: "Book",
        ctaHref: "/book",
        footerColumns: [],
        social: [],
        footerNote: "",
      },
      { About: "A propos" },
      "fr",
      "en",
    )
    expect(nav.header).toEqual([
      { label: "A propos", href: "/fr/about" },
      { label: "Docs", href: "https://docs.test" },
    ])
    expect(nav.ctaHref).toBe("/fr/book")
  })
})
