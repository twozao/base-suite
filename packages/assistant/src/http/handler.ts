import { z } from "zod"
import type { Assistant, Who } from "../assistant"
import { checkMcpUrl, McpError } from "../mcp/client"
import { keyName, PROVIDER_INFO } from "../providers/registry"
import {
  canChat,
  PROVIDER_TYPES,
  providerConfigSchema,
  settingsSchema,
} from "../settings"
import { pickLine, fillTemplate } from "../agent/small-talk"
import { randomToken } from "../crypto"
import type { Visitor, VisitorDetails } from "../store/store"
import {
  cleanPage,
  locationFromRequest,
  parseVisitorForm,
  visitorBody,
} from "../visitor"

// Web-standard Request to Response, so it mounts in a Worker, SvelteKit, Hono, Express with an adapter, or anything else.
export type HandlerOptions = {
  assistant: Assistant
  /** Where this is mounted, such as /assistant. */
  basePath: string
  /** Who is asking. The host decides how: a session cookie, an admin token. */
  authorize: (request: Request) => Promise<Who> | Who
  assets: { adminJs: string; widgetJs: string }
  allowedOrigins?: string[]
  /** Return false to refuse. Defaults to a small limit per address in this process. */
  rateLimit?: (request: Request, bucket: "chat") => Promise<boolean> | boolean
  /** Told about every admin change, for the host's audit log. Never receives a secret. */
  onAdminChange?: (
    request: Request,
    action: string,
    detail?: string,
  ) => Promise<void> | void
  /** Pulls the host's own content, offered as an Import button. */
  importSources?: () => Promise<
    {
      id: string
      title: string
      text: string
      origin?: string | null
      audience?: "public" | "user" | "admin"
    }[]
  >
  allowPrivateMcp?: boolean
  /** Hides private parts of a page path before it is stored or shown to a model, such as tokens in a link. */
  redactPage?: (path: string) => string
  /** Told when someone gives their details, so the host can add them to its CRM. */
  onVisitor?: (visitor: Visitor, request: Request) => Promise<void> | void
  /** Replaces the built-in reading of location from platform headers. */
  locate?: (request: Request) => VisitorDetails
}

const VISITOR_COOKIE = "assistant_visitor"
const VISITOR_DAYS = 180
const HISTORY_SHOWN = 50
const SYNC_EVERY_MS = 5 * 60_000

const MAX_BODY = 400_000
const json = (
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  Response.json(data, {
    status,
    headers: { "cache-control": "no-store", ...headers },
  })
const fail = (message: string, status = 400) => json({ error: message }, status)

const chatBody = z.object({
  page: z.string().max(2000).optional(),
  timezone: z.string().max(80).optional(),
  language: z.string().max(40).optional(),
  message: z.string().trim().min(1).max(2000),
  conversation: z.string().max(100).nullish(),
  debug: z.boolean().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      }),
    )
    .max(20)
    .optional(),
})
const providerBody = providerConfigSchema
  .partial({ id: true })
  .extend({ key: z.string().max(500).optional() })
const connectionBody = z.object({
  id: z.string().max(60).optional(),
  name: z.string().trim().min(1, "Give it a name").max(60),
  url: z.string().trim().min(1).max(500),
  enabled: z.boolean(),
  instructions: z.string().max(3000),
  audience: z.enum(["public", "user", "admin"]),
  timeoutMs: z.number().int().min(1000).max(60000),
  /** One "Name: value" per line. Absent keeps what is saved; empty removes it. */
  headers: z.string().max(4000).optional(),
})
const sourceBody = z.object({
  id: z.string().max(100).optional(),
  title: z.string().trim().min(1, "Give it a title").max(200),
  text: z.string().trim().min(1, "There is no text to add").max(200_000),
  origin: z.string().trim().max(500).nullish(),
  audience: z.enum(["public", "user", "admin"]),
})

const stripEmpty = (d: VisitorDetails) =>
  Object.fromEntries(Object.entries(d).filter(([, v]) => v)) as VisitorDetails

const clientKey = (r: Request) =>
  r.headers.get("cf-connecting-ip") ?? r.headers.get("x-real-ip") ?? "local"

export const createHandler = (o: HandlerOptions) => {
  const a = o.assistant
  const store = a.store
  const hits = new Map<string, { at: number; n: number }>()
  const defaultLimit = (r: Request) => {
    const key = clientKey(r)
    const now = Date.now()
    const e = hits.get(key)
    if (!e || now - e.at > 60_000) {
      if (hits.size > 5000) hits.clear()
      hits.set(key, { at: now, n: 1 })
      return true
    }
    e.n++
    return e.n <= 30
  }

  let lastSync = 0
  let syncing: Promise<unknown> | null = null
  /** Keeps the knowledge base up to date with the host's pages, at most every few minutes. */
  const syncSite = async () => {
    if (!o.importSources || Date.now() - lastSync < SYNC_EVERY_MS) return
    if (!(await a.getSettings()).siteSync) return
    if (!syncing) {
      lastSync = Date.now()
      const load = o.importSources
      syncing = load()
        .then((docs) => a.syncSite(docs))
        .catch((e) =>
          console.error(
            "assistant site sync failed",
            e instanceof Error ? e.message : e,
          ),
        )
        .finally(() => {
          syncing = null
        })
    }
    // Only the very first sync is waited for; after that a visitor never waits for pages to be re-read.
    if ((await store.listSources()).length === 0) await syncing
  }

  const readCookie = (req: Request) =>
    (req.headers.get("cookie") ?? "")
      .split(/;\s*/)
      .find((c) => c.startsWith(`${VISITOR_COOKIE}=`))
      ?.slice(VISITOR_COOKIE.length + 1)
  const cookieHeader = (req: Request, token: string, crossSite: boolean) => {
    const secure = new URL(req.url).protocol === "https:"
    return [
      `${VISITOR_COOKIE}=${token}`,
      `Path=${o.basePath}`,
      `Max-Age=${VISITOR_DAYS * 86_400}`,
      "HttpOnly",
      // An embed on another site can only keep its cookie this way, and browsers require Secure with it.
      crossSite && secure ? "SameSite=None" : "SameSite=Lax",
      ...(secure ? ["Secure"] : []),
    ].join("; ")
  }
  const userRef = (who: Who) => `user:${who.id}`
  /** Signed-in people are known from their account, on any device. Everyone else by the cookie in this browser. */
  const knownVisitor = async (req: Request, who: Who) => {
    if (who.id) return store.findVisitorByUser(userRef(who))
    const token = readCookie(req)
    return token && token.length <= 100 ? store.findVisitorByToken(token) : null
  }
  const located = (req: Request) => (o.locate ?? locationFromRequest)(req)
  const browserHints = (b: {
    timezone?: string
    language?: string
  }): VisitorDetails => ({
    timezone: b.timezone?.slice(0, 80) || null,
    language: b.language?.slice(0, 40) || null,
  })
  const visitorView = (v: Visitor) => ({ name: v.name })
  /** The first thing said on opening the chat, chosen from the admin's lines for who this is. */
  const welcome = async (
    s: Awaited<ReturnType<typeof a.getSettings>>,
    name: string | null | undefined,
    visitor: Visitor | null,
  ) => {
    const back =
      !!visitor && (await store.visitorHistory(visitor.id, 1)).length > 0
    const options = [
      back && name ? s.welcomeBack : "",
      name ? s.welcomeNamed : "",
      s.greeting,
    ]
    const lines = (options.find((x) => x.trim()) ?? s.greeting)
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
    return fillTemplate(pickLine(lines, []) ?? "", {
      name,
      assistant: s.assistantName,
    })
  }

  const console_ = async (line: string) => {
    const [cmd, ...rest] = line.trim().split(/\s+/)
    const arg = rest.join(" ")
    const say = (s: string) => ({ output: s })
    if (cmd !== "chat") return say(`Unknown command. Try: chat help`)
    const s = await store.getSettings()
    switch (arg) {
      case "help":
        return say(
          [
            "chat status            panel state, who can use it, providers",
            "chat enable | disable  switch the chat on or off",
            "chat public on | off   visitors who are not signed in",
            "chat users on | off    signed-in users",
            "chat ai on | off       model answers; off quotes passages only",
            "chat general on | off  let the model answer from general knowledge",
            "chat embed             embed the next passages",
          ].join("\n"),
        )
      case "enable":
      case "disable":
        await store.saveSettings({ enabled: arg === "enable" })
        return say(`Chat is ${arg === "enable" ? "on" : "off"}.`)
      case "public on":
      case "public off":
        await store.saveSettings({ allowPublic: arg.endsWith("on") })
        return say(`Visitors: ${arg.slice(7)}.`)
      case "users on":
      case "users off":
        await store.saveSettings({ allowUsers: arg.endsWith("on") })
        return say(`Signed-in users: ${arg.slice(6)}.`)
      case "ai on":
      case "ai off":
        await store.saveSettings({ aiWording: arg.endsWith("on") })
        return say(`Model answers: ${arg.slice(3)}.`)
      case "general on":
      case "general off":
        await store.saveSettings({ allowGeneral: arg.endsWith("on") })
        return say(`General knowledge: ${arg.slice(8)}.`)
      case "embed":
        return say(JSON.stringify(await a.embedPending()))
      case "status": {
        const engine = a.engineFor(s)
        const c = await store.counts(engine?.model ?? "")
        return say(
          [
            `chat: ${s.enabled ? "on" : "off"}  visitors: ${s.allowPublic ? "on" : "off"}  users: ${s.allowUsers ? "on" : "off"}`,
            `model answers: ${s.aiWording ? "on" : "off"}  general knowledge: ${s.allowGeneral ? "on" : "off"}`,
            `search: ${engine?.model ?? "keywords only"}, ${c.embedded}/${c.passages} passages embedded`,
            `providers: ${s.providers.map((p) => `${p.id}${p.enabled ? "" : " (off)"}`).join(" -> ") || "none"}`,
          ].join("\n"),
        )
      }
      default:
        return say("Unknown command. Try: chat help")
    }
  }

  const admin = async (
    req: Request,
    path: string,
    who: Who,
  ): Promise<Response> => {
    const method = req.method
    const body = async () =>
      method === "GET"
        ? {}
        : ((await req.json().catch(() => ({}))) as Record<string, unknown>)
    const changed = (action: string, detail?: string) =>
      o.onAdminChange?.(req, action, detail)
    const seg = path.split("/").filter(Boolean)
    void who

    if (path === "/overview" && method === "GET") {
      await syncSite()
      const s = await store.getSettings()
      const engine = a.engineFor(s)
      const [sources, counts, connections, usage, engineStatus] =
        await Promise.all([
          store.listSources(),
          store.counts(engine?.model ?? ""),
          store.listConnections(),
          store.usageToday(),
          engine
            ? engine
                .status()
                .catch((e) => ({ state: "failed", detail: String(e) }))
            : { state: "off" },
        ])
      const providers = await Promise.all(
        s.providers.map(async (p) => ({
          ...p,
          keySet: await store.hasSecret(keyName(p.id)),
          today: usage.find((u) => u.provider === p.id) ?? null,
        })),
      )
      return json({
        settings: { ...s, providers },
        sources,
        counts,
        engine: { model: engine?.model ?? null, ...engineStatus },
        connections,
        providerTypes: PROVIDER_TYPES.map((t) => ({
          type: t,
          ...PROVIDER_INFO[t],
        })),
        canImport: !!o.importSources,
      })
    }
    if (path === "/settings" && method === "POST") {
      const raw = await body()
      delete raw.providers
      const parsed = settingsSchema.partial().safeParse(raw)
      if (!parsed.success)
        return fail(
          `${parsed.error.issues[0].path.join(".")}: ${parsed.error.issues[0].message}`,
        )
      // partial() still fills defaults for absent fields, so keep only what was actually sent.
      const patch = Object.fromEntries(
        Object.entries(parsed.data).filter(([k]) => k in raw),
      )
      const s = await store.saveSettings(patch)
      await changed("settings", Object.keys(patch).join(","))
      return json({ settings: s })
    }

    if (seg[0] === "sources") {
      if (seg.length === 1 && method === "POST") {
        const p = sourceBody.safeParse(await body())
        if (!p.success) return fail(p.error.issues[0].message)
        if (p.data.origin && !/^(\/|https:\/\/)/.test(p.data.origin))
          return fail("A link must start with / or https://")
        const r = await a.addText({ ...p.data, kind: "text" })
        await changed("source.added", p.data.title)
        return json(r)
      }
      const id = decodeURIComponent(seg[1] ?? "")
      if (seg[2] === "chunks" && method === "GET")
        return json({ chunks: await store.sourceChunks(id) })
      if (seg.length === 2 && method === "PATCH") {
        const b = (await body()) as {
          enabled?: boolean
          audience?: "public" | "user" | "admin"
        }
        await store.setSourceEnabled(id, b.enabled !== false, b.audience)
        await changed("source.updated", id)
        return json({ ok: true })
      }
      if (seg.length === 2 && method === "DELETE") {
        await store.deleteSource(id)
        await changed("source.deleted", id)
        return json({ ok: true })
      }
    }
    if (path === "/import" && method === "POST") {
      if (!o.importSources)
        return fail("This site has nothing to import from", 404)
      const result = await a.syncSite(await o.importSources())
      await changed("source.imported", String(result.imported))
      return json(result)
    }
    if (path === "/embed" && method === "POST")
      return json(await a.embedPending())
    if (path === "/test-search" && method === "POST") {
      const b = (await body()) as {
        question?: string
        role?: "public" | "user" | "admin"
      }
      return json(
        await a.testSearch(
          String(b.question ?? "").slice(0, 2000),
          b.role ?? "public",
        ),
      )
    }
    if (path === "/prompt" && method === "POST") {
      const b = (await body()) as {
        question?: string
        role?: "public" | "user" | "admin"
      }
      return json(
        await a.promptPreview(
          String(b.question ?? "").slice(0, 2000),
          b.role ?? "public",
        ),
      )
    }

    if (seg[0] === "providers") {
      const s = await store.getSettings()
      if (seg.length === 1 && method === "POST") {
        const p = providerBody.safeParse({
          accountId: "",
          baseUrl: "",
          ...(await body()),
        })
        if (!p.success) return fail(p.error.issues[0].message)
        const { key, ...cfg } = p.data
        let id = cfg.id
        if (!id) {
          const taken = new Set(s.providers.map((x) => x.id))
          id = cfg.type
          for (let n = 2; taken.has(id); n++) id = `${cfg.type}-${n}`
        }
        if (cfg.type === "custom" && !/^https?:\/\//.test(cfg.baseUrl))
          return fail("Custom providers need a base URL")
        const entry = { ...cfg, id }
        const exists = s.providers.some((x) => x.id === id)
        await store.saveSettings({
          providers: exists
            ? s.providers.map((x) => (x.id === id ? entry : x))
            : [...s.providers, entry],
        })
        if (key) await store.setSecret(keyName(id), key)
        await changed("provider.saved", id)
        return json({ id })
      }
      if (path === "/providers/order" && method === "POST") {
        const { ids } = (await body()) as { ids?: string[] }
        const byId = new Map(s.providers.map((x) => [x.id, x]))
        const ordered = (ids ?? []).flatMap((i) =>
          byId.has(i) ? [byId.get(i)!] : [],
        )
        if (ordered.length !== s.providers.length)
          return fail("The list does not match")
        await store.saveSettings({ providers: ordered })
        await changed("provider.reordered")
        return json({ ok: true })
      }
      const id = seg[1]
      if (seg[2] === "test" && method === "POST")
        return json(await a.testProvider(id))
      if (seg.length === 2 && method === "DELETE") {
        await store.saveSettings({
          providers: s.providers.filter((x) => x.id !== id),
        })
        await store.setSecret(keyName(id), null)
        await changed("provider.deleted", id)
        return json({ ok: true })
      }
    }

    if (seg[0] === "mcp") {
      if (seg.length === 1 && method === "POST") {
        const p = connectionBody.safeParse(await body())
        if (!p.success) return fail(p.error.issues[0].message)
        try {
          checkMcpUrl(p.data.url, !!o.allowPrivateMcp)
        } catch (e) {
          return fail(e instanceof McpError ? e.message : "Invalid URL")
        }
        const id = p.data.id ?? crypto.randomUUID()
        const before = p.data.id ? await store.getConnection(id) : null
        const { headers, ...rest } = p.data
        await store.saveConnection({ ...rest, id, tools: before?.tools ?? [] })
        if (headers !== undefined)
          await store.setSecret(`mcp:${id}`, headers.trim() || null)
        await changed("mcp.saved", p.data.name)
        // Listing tools straight away tells the admin at once whether the URL and credentials work.
        return json({ id, ...(await a.refreshConnection(id)) })
      }
      const id = seg[1]
      if (seg[2] === "refresh" && method === "POST")
        return json(await a.refreshConnection(id))
      if (seg[2] === "tools" && method === "POST") {
        const b = (await body()) as { tool?: string; enabled?: boolean }
        const c = await store.getConnection(id)
        if (!c) return fail("Unknown connection", 404)
        await store.saveConnection({
          ...c,
          tools: c.tools.map((t) =>
            t.name === b.tool ? { ...t, enabled: !!b.enabled } : t,
          ),
        })
        await changed("mcp.tool", `${c.name}: ${b.tool}=${b.enabled}`)
        return json({ ok: true })
      }
      if (seg[2] === "call" && method === "POST") {
        const b = (await body()) as {
          tool?: string
          args?: Record<string, unknown>
        }
        try {
          return json(await a.callTool(id, String(b.tool), b.args ?? {}))
        } catch (e) {
          return fail(e instanceof Error ? e.message : "Call failed")
        }
      }
      if (seg.length === 2 && method === "DELETE") {
        await store.deleteConnection(id)
        await changed("mcp.deleted", id)
        return json({ ok: true })
      }
    }

    if (seg[0] === "visitors") {
      if (seg.length === 1 && method === "GET") {
        const u = new URL(req.url)
        const pageNo = Math.max(1, Number(u.searchParams.get("page")) || 1)
        return json({
          visitors: await store.listVisitors({
            q: u.searchParams.get("q")?.slice(0, 100) || undefined,
            limit: 50,
            offset: (pageNo - 1) * 50,
          }),
          page: pageNo,
        })
      }
      if (seg.length === 2 && method === "GET") {
        return json({
          logs: await store.listLogs({
            visitorId: seg[1],
            limit: 200,
            offset: 0,
          }),
        })
      }
      if (seg.length === 2 && method === "DELETE") {
        await store.deleteVisitor(seg[1])
        await changed("visitor.deleted", seg[1])
        return json({ ok: true })
      }
    }
    if (path === "/logs" && method === "GET") {
      const u = new URL(req.url)
      const page = Math.max(1, Number(u.searchParams.get("page")) || 1)
      return json({
        logs: await store.listLogs({
          route: u.searchParams.get("route") ?? undefined,
          q: u.searchParams.get("q")?.slice(0, 100) || undefined,
          limit: 50,
          offset: (page - 1) * 50,
        }),
        page,
      })
    }
    if (path === "/insights" && method === "GET") {
      const days = Math.min(
        365,
        Number(new URL(req.url).searchParams.get("days")) || 30,
      )
      return json(await store.insights(days))
    }
    if (path === "/console" && method === "POST") {
      const b = (await body()) as { command?: string }
      const out = await console_(String(b.command ?? ""))
      await changed("console", String(b.command ?? "").slice(0, 100))
      return json(out)
    }
    return fail("Not found", 404)
  }

  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url)
    if (!url.pathname.startsWith(o.basePath)) return fail("Not found", 404)
    const path = url.pathname.slice(o.basePath.length) || "/"
    const origin = req.headers.get("origin")
    const cors: Record<string, string> =
      origin && o.allowedOrigins?.includes(origin)
        ? {
            "access-control-allow-origin": origin,
            vary: "origin",
            "access-control-allow-headers": "content-type",
            "access-control-allow-credentials": "true",
          }
        : {}

    if (path === "/widget.js" || path === "/admin.js") {
      return new Response(
        path === "/widget.js" ? o.assets.widgetJs : o.assets.adminJs,
        {
          headers: {
            "content-type": "text/javascript; charset=utf-8",
            "cache-control": "public, max-age=300",
          },
        },
      )
    }
    if (req.method === "OPTIONS")
      return new Response(null, {
        status: 204,
        headers: { ...cors, "access-control-allow-methods": "POST, GET" },
      })

    if (req.method !== "GET") {
      // JSON only and same origin: a form on another site can send neither, so cookies cannot be used against an admin.
      if (!(req.headers.get("content-type") ?? "").includes("application/json"))
        return fail("Send JSON", 415)
      const publicPath =
        path === "/chat" || path === "/rate" || path.startsWith("/visitor")
      if (
        origin &&
        origin !== url.origin &&
        !(publicPath && cors["access-control-allow-origin"])
      )
        return fail("Cross-site request refused", 403)
      if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY)
        return fail("Too much data", 413)
    }

    const who = await o.authorize(req)

    if (path.startsWith("/admin/")) {
      if (who.role !== "admin") return fail("Not allowed", 403)
      try {
        return await admin(req, path.slice("/admin".length), who)
      } catch (e) {
        console.error(
          "assistant admin failed",
          path,
          e instanceof Error ? e.message : e,
        )
        return fail(
          e instanceof z.ZodError
            ? e.issues[0].message
            : "That did not work. Please try again.",
          500,
        )
      }
    }
    if (path === "/config" && req.method === "GET") {
      const s = await a.getSettings()
      const known = await knownVisitor(req, who)
      const f = s.visitorForm
      return json(
        {
          form:
            f.enabled && !known && !who.id
              ? {
                  name: f.name,
                  email: f.email,
                  phone: f.phone,
                  location: f.location,
                  emailOrPhone: f.emailOrPhone,
                  intro: f.intro,
                  notice: f.notice,
                }
              : null,
          visitor: known
            ? visitorView(known)
            : who.id
              ? { name: who.name ?? null }
              : null,
          preciseLocation: f.preciseLocation && !known?.latitude,
          available: canChat(s, who.role),
          name: s.assistantName,
          greeting: await welcome(s, known?.name ?? who.name, known),
          handoff: s.handoffUrl
            ? { label: s.handoffLabel, url: s.handoffUrl }
            : null,
        },
        200,
        cors,
      )
    }
    if (path === "/chat" && req.method === "POST") {
      const allowed = await (o.rateLimit
        ? o.rateLimit(req, "chat")
        : defaultLimit(req))
      if (!allowed)
        return json(
          { error: "Too many messages. Please wait a moment." },
          429,
          cors,
        )
      const p = chatBody.safeParse(await req.json().catch(() => null))
      if (!p.success)
        return json({ error: "Please type a message." }, 400, cors)
      await syncSite()
      const s = await a.getSettings()
      const page = cleanPage(p.data.page, o.redactPage)
      let visitor = await knownVisitor(req, who)
      if (!visitor && who.id) {
        visitor = await store.createVisitor(
          { name: who.name ?? null, email: who.email ?? null },
          { userRef: userRef(who) },
        )
      }
      if (!visitor && s.visitorForm.enabled && canChat(s, who.role)) {
        return json(
          {
            error: "Please tell us a little about yourself first.",
            needsDetails: true,
          },
          428,
          cors,
        )
      }
      if (visitor) {
        visitor = await store.updateVisitor(visitor.id, {
          ...browserHints(p.data),
          ...stripEmpty(located(req)),
          lastPage: page,
        })
      }
      const reply = await a.chat({
        question: p.data.message,
        who,
        visitor,
        page,
        history: p.data.history,
        conversation: p.data.conversation,
        debug: p.data.debug && who.role === "admin",
      })
      if (reply.route === "off")
        return json({ error: "Chat is not available." }, 403, cors)
      return json(reply, 200, cors)
    }
    if (path === "/visitor" && req.method === "POST") {
      const allowed = await (o.rateLimit
        ? o.rateLimit(req, "chat")
        : defaultLimit(req))
      if (!allowed)
        return json(
          { error: "Too many requests. Please wait a moment." },
          429,
          cors,
        )
      const b = visitorBody.safeParse(await req.json().catch(() => null))
      if (!b.success)
        return json({ error: "Please check your details." }, 400, cors)
      const s = await a.getSettings()
      const parsed = parseVisitorForm(s.visitorForm, b.data)
      if (!parsed.ok) return json({ errors: parsed.errors }, 400, cors)
      const details = {
        ...parsed.details,
        ...browserHints(b.data),
        ...stripEmpty(located(req)),
        lastPage: cleanPage(b.data.page, o.redactPage),
      }
      const known = await knownVisitor(req, who)
      if (known) {
        const v = await store.updateVisitor(known.id, details)
        return json(
          { visitor: visitorView(v), greeting: await welcome(s, v.name, v) },
          200,
          cors,
        )
      }
      const token = randomToken()
      const visitor = await store.createVisitor(details, { token })
      await Promise.resolve(o.onVisitor?.(visitor, req)).catch(() => null)
      return json(
        {
          visitor: visitorView(visitor),
          greeting: await welcome(s, visitor.name, visitor),
        },
        200,
        {
          ...cors,
          "set-cookie": cookieHeader(
            req,
            token,
            !!cors["access-control-allow-origin"],
          ),
        },
      )
    }
    if (path === "/visitor/position" && req.method === "POST") {
      const known = await knownVisitor(req, who)
      if (!known) return json({ error: "Unknown visitor" }, 404, cors)
      const s = await a.getSettings()
      if (!s.visitorForm.preciseLocation)
        return json({ error: "Not enabled" }, 403, cors)
      const b = (await req.json().catch(() => ({}))) as {
        latitude?: unknown
        longitude?: unknown
      }
      const lat = Number(b.latitude)
      const lng = Number(b.longitude)
      if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180))
        return json({ error: "Invalid position" }, 400, cors)
      await store.updateVisitor(known.id, {
        latitude: lat.toFixed(4),
        longitude: lng.toFixed(4),
      })
      return json({ ok: true }, 200, cors)
    }
    if (path === "/history" && req.method === "GET") {
      // Only this browser's cookie or the signed-in account unlocks history, never an email typed into a form.
      const known = await knownVisitor(req, who)
      return json(
        {
          history: known
            ? await store.visitorHistory(known.id, HISTORY_SHOWN)
            : [],
        },
        200,
        cors,
      )
    }
    if (path === "/rate" && req.method === "POST") {
      const b = (await req.json().catch(() => ({}))) as {
        id?: string
        rating?: number
      }
      if (b.id && (b.rating === 1 || b.rating === -1))
        await store.rateLog(String(b.id).slice(0, 60), b.rating)
      return json({ ok: true }, 200, cors)
    }
    return fail("Not found", 404)
  }
}
