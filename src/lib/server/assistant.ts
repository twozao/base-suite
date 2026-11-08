import { CompiledQuery, PostgresAdapter } from "kysely"
import {
  createAssistant,
  createHandler,
  type Assistant,
  type SqlDriver,
} from "$assistant/index"
import { NEEDLE_MODEL, remoteEngine } from "$assistant/embed/needle-core"
import type { EmbeddingEngine } from "$assistant/embed/types"
import adminJs from "$assistant/ui/admin.js?raw"
import widgetJs from "$assistant/ui/widget.js?raw"
import { isModuleEnabled } from "$lib/modules"
import { captureLead } from "./crm"
import { getStaff } from "./auth/staff"
import { secretMaterial } from "./auth/signin"
import { audit } from "./audit"
import type { Db } from "./db"
import { rateLimit, RATE_LIMITS } from "./security/rate_limit"
import { clientIp } from "./security/request"
import { getSettings } from "./settings"
import { platformBindings } from "./platform"
import { nowIso } from "./db/json"
import type { RequestEvent } from "@sveltejs/kit"

// The only file joining Base Suite to the assistant package: its database, sign-in, rate limits and audit log.
export const kyselyDriver = (db: Db): SqlDriver => {
  const isPg = db.getExecutor().adapter instanceof PostgresAdapter
  const prepare = (query: string, params: unknown[]) => {
    let n = 0
    return CompiledQuery.raw(
      isPg ? query.replace(/\?/g, () => `$${++n}`) : query,
      params as never[],
    )
  }
  return {
    all: async (query, params = []) =>
      (await db.executeQuery(prepare(query, params))).rows as Record<
        string,
        unknown
      >[],
    run: async (query, params = []) => {
      await db.executeQuery(prepare(query, params))
    },
  }
}

// Needle runs in a worker thread on Node. On Cloudflare it is the separate Needle Worker, when bound;
// without it search uses keywords.
let needle: Promise<EmbeddingEngine | null> | null = null
const needleEngine = () =>
  (needle ??= __CLOUDFLARE__
    ? Promise.resolve(
        platformBindings().NEEDLE
          ? remoteEngine(platformBindings().NEEDLE as never)
          : null,
      )
    : Promise.all([
        import("$assistant/embed/needle-node"),
        import("node:path"),
      ]).then(([{ needleNodeEngine }, { resolve }]) =>
        needleNodeEngine({
          packageDir: resolve("packages/assistant"),
          cacheDir: resolve("data/needle"),
        }),
      ))

// Starts the engine on first use, so a page that never searches never loads it.
const NEEDLE: EmbeddingEngine = {
  model: NEEDLE_MODEL,
  async embed(texts) {
    const engine = await needleEngine()
    if (!engine) throw new Error("Needle is not available")
    return engine.embed(texts)
  },
  async status() {
    const engine = await needleEngine()
    return engine
      ? engine.status()
      : { state: "off", detail: "Needle Worker not bound" }
  },
}
const needleAvailable = () => !__CLOUDFLARE__ || !!platformBindings().NEEDLE

let instance: { db: Db; assistant: Assistant } | null = null

export const getAssistant = (db: Db) => {
  if (instance?.db !== db) {
    instance = {
      db,
      assistant: createAssistant({
        db: kyselyDriver(db),
        secretKey: secretMaterial(),
        ai: (platformBindings().AI as never) ?? null,
        embedding: (s) =>
          s.embeddingEngine === "needle" && needleAvailable() ? NEEDLE : null,
        hostInstructions: async () => {
          const { brand } = await getSettings(db)
          return `This is the website of ${brand.siteName}. ${brand.description}`.trim()
        },
      }),
    }
  }
  return instance.assistant
}

/** Published pages and blog posts, offered as "Import site content". */
/** What the site says outside its pages: services and FAQ on the home page, plans, and what can be booked. */
const settingsDocuments = async (db: Db) => {
  const s = await getSettings(db)
  const { hero, features, faq } = s.home
  const doc = (id: string, title: string, origin: string, parts: string[]) => ({
    id: `site:${id}`,
    title,
    origin,
    text: parts.filter(Boolean).join("\n\n"),
    audience: "public" as const,
  })
  const docs = []
  if (features.show && features.items.length) {
    docs.push(
      doc("services", "Services", "/", [
        `Services ${s.brand.siteName} can provide and has on offer. ${hero.title} ${hero.highlight}. ${hero.subtitle}`,
        `${features.title}:`,
        ...features.items.map((f) => `${f.title}: ${f.body}`),
      ]),
    )
  }
  if (faq.show && faq.items.length) {
    docs.push(
      doc(
        "faq",
        "Questions and answers",
        "/",
        faq.items.map((f) => `${f.q}\n${f.a}`),
      ),
    )
  }
  // Same rule as the /pricing page, so the chat never quotes plans the site does not offer.
  if (isModuleEnabled("subscriptions") && s.pricing.plans.length) {
    docs.push(
      doc("pricing", "Pricing", "/pricing", [
        `Pricing, plans and how much it costs. ${s.pricing.title}. ${s.pricing.subtitle}`,
        ...s.pricing.plans.map(
          (p) =>
            `${p.name}: ${p.price} ${p.interval}. ${p.description} Includes: ${p.features.join(", ")}.`,
        ),
      ]),
    )
  }
  if (isModuleEnabled("booking")) {
    const types = await db
      .selectFrom("booking_event_types")
      .select(["name", "description", "duration_minutes"])
      .where("active", "=", 1)
      .limit(50)
      .execute()
    if (types.length) {
      docs.push(
        doc("booking", "Booking", "/book", [
          "Book a call or meeting online. You can book:",
          ...types.map(
            (b) =>
              `${b.name}, ${b.duration_minutes} minutes. ${b.description ?? ""}`,
          ),
        ]),
      )
    }
  }
  return docs
}

const siteDocuments = (db: Db) => async () => {
  const now = nowIso()
  const [pages, posts] = await Promise.all([
    db
      .selectFrom("cms_pages")
      .select(["slug", "title", "body_md"])
      .where("status", "=", "published")
      .limit(1000)
      .execute(),
    db
      .selectFrom("posts")
      .select(["slug", "title", "body_md"])
      .where("status", "=", "published")
      .where("published_at", "<=", now)
      .limit(1000)
      .execute(),
  ])
  return [
    ...(await settingsDocuments(db)),
    ...pages.map((p) => ({
      id: `page:${p.slug}`,
      title: p.title,
      text: p.body_md,
      origin: `/${p.slug}`,
      audience: "public" as const,
    })),
    ...posts.map((p) => ({
      id: `post:${p.slug}`,
      title: p.title,
      text: p.body_md,
      origin: `/blog/${p.slug}`,
      audience: "public" as const,
    })),
  ].filter((d) => d.text.trim())
}

export const assistantHandler = (event: RequestEvent) => {
  const db = event.locals.db
  return createHandler({
    assistant: getAssistant(db),
    basePath: "/assistant",
    assets: { adminJs, widgetJs },
    importSources: siteDocuments(db),
    authorize: async () => {
      const user = event.locals.user
      if (!user) return { role: "public" }
      const staff = await getStaff(event)
      const profile = await db
        .selectFrom("profiles")
        .select("full_name")
        .where("id", "=", user.id)
        .executeTakeFirst()
      return {
        role: staff?.permissions.has("assistant.manage") ? "admin" : "user",
        id: user.id,
        name: profile?.full_name || user.email,
        email: user.email,
      }
    },
    // Links in these places carry private tokens, which must not reach logs or a model.
    redactPage: (path) =>
      path
        .replace(/^\/book\/manage\/.*/, "/book/manage")
        .replace(/^\/ticket\/.*/, "/ticket")
        .replace(/^\/login\/reset_password.*/, "/login/reset_password"),
    onVisitor: (visitor) => {
      void captureLead(db, {
        email: visitor.email,
        name: visitor.name,
        phone: visitor.phone,
        source: "assistant",
        kind: "chat",
        body: `Started an AI chat${visitor.lastPage ? ` on ${visitor.lastPage}` : ""}`,
        ref: { type: "assistant_visitor", id: visitor.id },
      })
    },
    rateLimit: () =>
      rateLimit(db, `assistant:${clientIp(event)}`, RATE_LIMITS.assistantChat),
    onAdminChange: (_request, action, detail) =>
      audit(
        event,
        "assistant.changed",
        { type: "assistant", id: action },
        detail ? { detail } : undefined,
      ),
  })(event.request)
}
