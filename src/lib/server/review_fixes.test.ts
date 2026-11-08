import { beforeEach, describe, expect, it, vi } from "vitest"
import type { RequestEvent } from "@sveltejs/kit"
import type { Db } from "./db"
import { createTestDb } from "./db/test_db"
import { createUser } from "./auth/users"
import {
  completeChallenge,
  finishFirstStep,
  MFA_COOKIE,
} from "./auth/two_factor"
import { findRedirect, invalidateRedirects } from "./redirects"
import { cleanFieldValues } from "./cms/types"
import { contentApi } from "./plugins/content_api"
import { authenticateToken, createToken } from "./plugins/tokens"

vi.mock("$env/dynamic/private", () => ({
  env: { PRIVATE_SECRETS_KEY: "test-key-material" },
}))

let db: Db
beforeEach(async () => {
  db = await createTestDb()
  invalidateRedirects()
})

const fakeEvent = () => {
  const jar = new Map<string, string>()
  return {
    jar,
    ev: {
      locals: { db, user: null, session: null },
      url: new URL("https://site.test/login/sign_in"),
      cookies: {
        get: (k: string) => jar.get(k),
        set: (k: string, v: string) => jar.set(k, v),
        delete: (k: string) => jar.delete(k),
      },
    } as never,
  }
}

describe("review fixes", () => {
  it("asks a passkey owner for a second step after the password", async () => {
    const r = await createUser(db, {
      email: "p@x.test",
      password: "a-long-password-1",
    })
    if (!r.ok) throw new Error("user")
    const { ev, jar } = fakeEvent()
    expect(await finishFirstStep(ev, r.user.id, "/admin")).toBe("/admin")
    jar.clear()
    await db
      .insertInto("user_passkeys")
      .values({ id: "cred1", user_id: r.user.id, public_key: "x", name: "Key" })
      .execute()
    expect(await finishFirstStep(ev, r.user.id, "/admin")).toBe(
      "/login/two_factor",
    )
    expect(jar.has(MFA_COOKIE)).toBe(true)
    expect(jar.has("session")).toBe(false)
  })
  it("stops after five wrong codes", async () => {
    const r = await createUser(db, {
      email: "q@x.test",
      password: "a-long-password-1",
    })
    if (!r.ok) throw new Error("user")
    await db
      .insertInto("user_passkeys")
      .values({ id: "cred2", user_id: r.user.id, public_key: "x", name: "Key" })
      .execute()
    const { ev } = fakeEvent()
    await finishFirstStep(ev, r.user.id, "/admin")
    const results = await Promise.all(
      Array.from({ length: 8 }, () => completeChallenge(ev, "nope-nope")),
    )
    expect(results.filter((x) => !x.ok && !x.expired)).toHaveLength(5)
  })
  it("never redirects to another site through a section rule", async () => {
    await db
      .insertInto("redirects")
      .values({ from_path: "/old/*", to_url: "/*", status_code: 301 })
      .execute()
    expect((await findRedirect(db, "/old/about"))?.to).toBe("/about")
    expect(await findRedirect(db, "/old//evil.com")).toBeNull()
    expect(await findRedirect(db, "/old/\\evil.com")).toBeNull()
  })
  it("drops field values that do not fit their type", () => {
    const out = cleanFieldValues(
      [
        {
          key: "site",
          label: "Site",
          type: "link",
          required: false,
          help: "",
          options: [],
          relation: "",
          showInList: false,
        },
      ],
      { site: "javascript:alert(1)" },
    )
    expect(out).toEqual({})
  })
  it("PATCH changes only what is sent, and scheduled posts stay hidden", async () => {
    const auth = await authenticateToken(
      db,
      `Bearer ${(await createToken(db, { name: "w", scopes: ["content:write"], createdBy: null })).token}`,
    )
    const ev = (method: string, path: string, body?: unknown) =>
      ({
        request: new Request(`https://s.test/api/v1/${path}`, {
          method,
          body: body ? JSON.stringify(body) : undefined,
        }),
        url: new URL(`https://s.test/api/v1/${path}`),
        locals: { db, user: null, session: null },
        getClientAddress: () => "1.1.1.1",
      }) as unknown as RequestEvent
    const made = await (
      await contentApi(
        ev("POST", "posts", {
          title: "Live",
          markdown: "Body text",
          status: "published",
          tags: ["news"],
        }),
        auth,
        ["posts"],
      )
    ).json()
    await contentApi(
      ev("PATCH", `posts/${made.data.id}`, { title: "Renamed" }),
      auth,
      ["posts", made.data.id],
    )
    const row = await db
      .selectFrom("posts")
      .selectAll()
      .executeTakeFirstOrThrow()
    expect(row).toMatchObject({
      title: "Renamed",
      status: "published",
      tags: '["news"]',
    })
    expect(row.body_html).toContain("Body text")
    await db
      .insertInto("posts")
      .values({
        id: crypto.randomUUID(),
        slug: "later",
        title: "Later",
        status: "published",
        published_at: "2999-01-01T00:00:00.000Z",
      })
      .execute()
    await expect(
      contentApi(ev("GET", "posts/later"), null, ["posts", "later"]),
    ).rejects.toMatchObject({ status: 404 })
  })
})
