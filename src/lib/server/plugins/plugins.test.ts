import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { RequestEvent } from "@sveltejs/kit"
import type { Db } from "../db"
import { createTestDb } from "../db/test_db"
import { hmacSha256Hex } from "../security/crypto"
import { sealValue } from "../security/vault"
import { invalidateSettings, getSettings } from "../settings"
import { APP_SECRET_CONTEXT, renderAppBlock, signBody } from "./apps"
import { CATALOGUE } from "./catalogue"
import { contentApi } from "./content_api"
import { deliverDue, emit, WEBHOOK_SECRET_CONTEXT } from "./events"
import {
  installExtension,
  parseManifest,
  uninstallExtension,
} from "./extensions"
import { authenticateToken, createToken, revokeToken } from "./tokens"

vi.mock("$env/dynamic/private", () => ({
  env: { PRIVATE_SECRETS_KEY: "test-key-material" },
}))
vi.mock("node:dns/promises", () => {
  const lookup = async () => [{ address: "93.184.216.34", family: 4 }]
  return { lookup, default: { lookup } }
})

let db: Db
beforeEach(async () => {
  db = await createTestDb()
  invalidateSettings()
})
afterEach(() => vi.unstubAllGlobals())

/** Waits for the background delivery to record its first attempt. */
const attempted = async () => {
  for (let i = 0; i < 100; i++) {
    const row = await db
      .selectFrom("webhook_deliveries")
      .select("attempts")
      .executeTakeFirst()
    if (row && row.attempts > 0) return
    await new Promise((r) => setTimeout(r, 10))
  }
  throw new Error("no delivery attempt")
}

const apiEvent = (method: string, path: string, body?: unknown) =>
  ({
    request: new Request(`https://site.test/api/v1/${path}`, {
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers: { "content-type": "application/json" },
    }),
    url: new URL(`https://site.test/api/v1/${path}`),
    locals: { db, user: null, session: null },
    getClientAddress: () => "1.2.3.4",
  }) as unknown as RequestEvent

const call = async (
  method: string,
  path: string,
  auth: Awaited<ReturnType<typeof authenticateToken>>,
  body?: unknown,
) => {
  try {
    const res = await contentApi(
      apiEvent(method, path, body),
      auth,
      path.split("?")[0].split("/"),
    )
    return {
      status: res.status,
      body: res.status === 204 ? null : await res.json(),
    }
  } catch (e) {
    return {
      status: (e as { status: number }).status,
      body: (e as { body: unknown }).body,
    }
  }
}

describe("API tokens", () => {
  it("authenticates, carries scopes and stops working when revoked", async () => {
    const { id, token } = await createToken(db, {
      name: "t",
      scopes: ["content:read"],
      createdBy: null,
    })
    const auth = await authenticateToken(db, `Bearer ${token}`)
    expect(auth?.scopes.has("content:read")).toBe(true)
    expect(
      await authenticateToken(db, "Bearer bs_wrongwrongwrongwrongwrong"),
    ).toBeNull()
    await revokeToken(db, id)
    expect(await authenticateToken(db, `Bearer ${token}`)).toBeNull()
  })
})

describe("Content API", () => {
  it("shows published content to anyone and drafts only with a token", async () => {
    await db
      .insertInto("posts")
      .values([
        {
          id: crypto.randomUUID(),
          slug: "live",
          title: "Live",
          status: "published",
          published_at: "2020-01-01T00:00:00.000Z",
        },
        {
          id: crypto.randomUUID(),
          slug: "draft",
          title: "Draft",
          status: "draft",
        },
      ])
      .execute()
    expect(
      (await call("GET", "posts", null)).body.data.map(
        (p: { slug: string }) => p.slug,
      ),
    ).toEqual(["live"])
    expect((await call("GET", "posts/draft", null)).status).toBe(404)
    const { token } = await createToken(db, {
      name: "r",
      scopes: ["content:read"],
      createdBy: null,
    })
    const auth = await authenticateToken(db, `Bearer ${token}`)
    const all = await contentApi(apiEvent("GET", "posts?status=all"), auth, [
      "posts",
    ])
    expect((await all.json()).data).toHaveLength(2)
  })
  it("writes need the write scope and go through the same checks", async () => {
    const read = await authenticateToken(
      db,
      `Bearer ${(await createToken(db, { name: "r", scopes: ["content:read"], createdBy: null })).token}`,
    )
    expect((await call("POST", "pages", read, { title: "Hi" })).status).toBe(
      403,
    )
    const write = await authenticateToken(
      db,
      `Bearer ${(await createToken(db, { name: "w", scopes: ["content:write"], createdBy: null })).token}`,
    )
    const made = await call("POST", "pages", write, {
      title: "Our story",
      markdown: "We **build**.",
      status: "published",
    })
    expect(made.status).toBe(201)
    const page = await db
      .selectFrom("cms_pages")
      .selectAll()
      .where("slug", "=", "our-story")
      .executeTakeFirstOrThrow()
    expect(page.body_html).toContain("<strong>build</strong>")
    expect(
      (await call("POST", "pages", write, { title: "x", slug: "admin" }))
        .status,
    ).toBe(400)
    expect(
      (
        await call("POST", "pages", write, {
          title: "x",
          blocks: [{ type: "image", src: "/media/a.png" }],
          status: "published",
        })
      ).status,
    ).toBe(400)
    expect(
      (await call("DELETE", `pages/${made.body.data.id}`, write)).status,
    ).toBe(204)
  })
})

describe("webhooks", () => {
  it("queues events, signs deliveries and retries failures", async () => {
    await db
      .insertInto("webhooks")
      .values({
        id: "w1",
        url: "https://hooks.example.com/in",
        secret: sealValue("shh", WEBHOOK_SECRET_CONTEXT("w1")),
        events: '["content.published"]',
      })
      .execute()
    const seen: { sig: string; body: string }[] = []
    let ok = false
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_u: URL, init: RequestInit) => {
        seen.push({
          sig: new Headers(init.headers).get("x-base-suite-signature") ?? "",
          body: String(init.body),
        })
        return new Response("", { status: ok ? 200 : 500 })
      }),
    )
    expect(await emit(db, "contact.created", {})).toBe(0)
    expect(await emit(db, "content.published", { id: "p" })).toBe(1)
    await attempted()
    const [t, v1] = seen[0].sig.split(",").map((x) => x.split("=")[1])
    expect(v1).toBe(await hmacSha256Hex("shh", `${t}.${seen[0].body}`))
    let row = await db
      .selectFrom("webhook_deliveries")
      .selectAll()
      .executeTakeFirstOrThrow()
    expect(row).toMatchObject({
      status: "pending",
      attempts: 1,
      response_code: 500,
    })
    ok = true
    await db
      .updateTable("webhook_deliveries")
      .set({ next_attempt_at: "2000-01-01T00:00:00.000Z" })
      .execute()
    expect(await deliverDue(db)).toBe(1)
    row = await db
      .selectFrom("webhook_deliveries")
      .selectAll()
      .executeTakeFirstOrThrow()
    expect(row.status).toBe("delivered")
  })
  it("never sends to private addresses", async () => {
    await db
      .insertInto("webhooks")
      .values({
        id: "w2",
        url: "https://127.0.0.1/x",
        secret: sealValue("s", WEBHOOK_SECRET_CONTEXT("w2")),
        events: '["*"]',
      })
      .execute()
    const f = vi.fn()
    vi.stubGlobal("fetch", f)
    await emit(db, "user.created", {})
    await attempted()
    expect(f).not.toHaveBeenCalled()
    const row = await db
      .selectFrom("webhook_deliveries")
      .select("error")
      .executeTakeFirstOrThrow()
    expect(row.error).toMatch(/not public/)
  })
})

describe("extensions", () => {
  it("installs a catalogue extension, refuses clashes, and uninstalls cleanly", async () => {
    const m = parseManifest(
      JSON.stringify(CATALOGUE.find((c) => c.id === "case-studies")),
    )
    if ("error" in m) throw new Error(m.error)
    expect(await installExtension(db, m, null)).toEqual({ ok: true })
    expect(await installExtension(db, m, null)).toHaveProperty("error")
    const t = await db
      .selectFrom("content_types")
      .selectAll()
      .executeTakeFirstOrThrow()
    expect(t).toMatchObject({
      url_prefix: "case-studies",
      extension_id: "case-studies",
    })
    expect(
      await db.selectFrom("content_entries").select("slug").execute(),
    ).toEqual([{ slug: "sample-project" }])
    await uninstallExtension(db, "case-studies", false, null)
    expect(
      await db.selectFrom("content_entries").selectAll().execute(),
    ).toEqual([])
    expect(await db.selectFrom("content_types").selectAll().execute()).toEqual(
      [],
    )
  })
  it("keeps content when asked and switches settings back off", async () => {
    const seo = parseManifest(
      JSON.stringify(CATALOGUE.find((c) => c.id === "seo-pack")),
    )
    const team = parseManifest(
      JSON.stringify(CATALOGUE.find((c) => c.id === "team")),
    )
    if ("error" in seo || "error" in team) throw new Error("manifest")
    await installExtension(db, seo, null)
    invalidateSettings()
    expect((await getSettings(db)).seo.structuredData).toBe(true)
    await uninstallExtension(db, "seo-pack", false, null)
    invalidateSettings()
    expect((await getSettings(db)).seo.structuredData).toBe(false)
    await installExtension(db, team, null)
    await uninstallExtension(db, "team", true, null)
    expect(
      await db
        .selectFrom("content_types")
        .select(["slug", "extension_id"])
        .execute(),
    ).toEqual([{ slug: "team_member", extension_id: null }])
  })
  it("rejects packages with bad data", () => {
    expect(parseManifest("{")).toHaveProperty("error")
    expect(
      parseManifest(JSON.stringify({ id: "x", name: "X", version: "1" })),
    ).toHaveProperty("error")
    expect(
      parseManifest(
        JSON.stringify({
          id: "bad-links",
          name: "X",
          version: "1.0.0",
          redirects: [{ from: "/admin", to: "/x" }],
        }),
      ),
    ).toHaveProperty("error")
  })
})

describe("apps", () => {
  it("renders app blocks from core blocks only, signed with the app secret", async () => {
    await db
      .insertInto("apps")
      .values({
        id: "a1",
        name: "Weather",
        base_url: "https://weather.example.com",
        secret: sealValue("appsecret", APP_SECRET_CONTEXT("a1")),
        blocks: JSON.stringify([{ name: "today", label: "Today", props: [] }]),
      })
      .execute()
    let sig = ""
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_u: URL, init: RequestInit) => {
        sig = new Headers(init.headers).get("x-base-suite-signature") ?? ""
        return Response.json({
          blocks: [
            { type: "markdown", md: "Sunny" },
            { type: "app", app: "a1", block: "today" },
            { type: "html", html: "<script>x</script>" },
          ],
        })
      }),
    )
    const out = await renderAppBlock(db, {
      type: "app",
      app: "a1",
      block: "today",
      props: {},
    })
    expect(out.map((b) => b.type)).toEqual(["markdown", "html"])
    expect(sig).toMatch(/^t=\d+,v1=[0-9a-f]{64}$/)
    expect(
      await renderAppBlock(db, {
        type: "app",
        app: "a1",
        block: "unknown",
        props: {},
      }),
    ).toEqual([])
    await db.updateTable("apps").set({ enabled: 0 }).execute()
    expect(
      await renderAppBlock(db, {
        type: "app",
        app: "a1",
        block: "today",
        props: {},
      }),
    ).toEqual([])
  })
  it("signs bodies the way apps verify them", async () => {
    const s = await signBody("k", "{}", 1_700_000_000_000)
    expect(s).toBe(
      `t=1700000000,v1=${await hmacSha256Hex("k", "1700000000.{}")}`,
    )
  })
})
