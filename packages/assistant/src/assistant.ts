import { encodeVector } from "./crypto"
import {
  leaksInstructions,
  looksLikeInjection,
  matchesBlockedTopic,
  scrubSecrets,
} from "./agent/guard"
import { buildSystemPrompt, FIXED_RULES } from "./agent/prompt"
import {
  fillTemplate,
  matchSmallTalk,
  pickLine,
  smallTalkLine,
  smallTalkPrompt,
  type SmallTalkKind,
} from "./agent/small-talk"
import type { EmbeddingEngine } from "./embed/types"
import {
  callMcpTool,
  listMcpTools,
  parseHeaderLines,
  type McpTarget,
} from "./mcp/client"
import { buildProvider, keyName, runChain } from "./providers/registry"
import type { WorkersAiBinding } from "./providers/cloudflare"
import type { ChatMessage, Provider, ToolDef } from "./providers/types"
import {
  buildIndex,
  passagePrefix,
  search,
  type Hit,
  type SearchIndex,
  type SearchResult,
} from "./retrieval/search"
import { chunkText } from "./retrieval/text"
import { canChat, type Role, type Settings } from "./settings"
import type { SqlDriver } from "./store/driver"
import {
  createStore,
  type Audience,
  type McpConnection,
  type Visitor,
} from "./store/store"
import { locationLabel, visitorContext } from "./visitor"

const QUERY_EMBED_TIMEOUT_MS = 4000
const PROVIDER_TIMEOUT_MS = 25_000
const MAX_HISTORY = 10
/** Earlier turns only carry into the model while the conversation is recent. */
const HISTORY_FRESH_MS = 24 * 3_600_000
const CITE_WITHIN = 0.6
/** Saying hello again after this long is a new hello, not a repeat. */
const REPEAT_WINDOW_MS = 30 * 60_000
const SMALL_TALK_MAX_TOKENS = 200
const TOPICS_SHOWN = 4
const NOT_A_TOPIC = /^(home|about|privacy|terms|cookies?|sitemap|legal)\b/i
// What people most often come to ask about goes first.
const LEAD_TOPICS = [
  /services?/i,
  /pricing|plans?/i,
  /book/i,
  /work|projects?/i,
]
const NO_TOPICS_LINE = "I'm here. What would you like to know?"

export type Who = {
  role: Role
  id?: string | null
  name?: string | null
  email?: string | null
}
export type Route =
  | "off"
  | "blocked"
  | "guarded"
  | "quote"
  | "ai"
  | "tools"
  | "honesty"
  | "smalltalk"
export type Reply = {
  text: string
  route: Route
  sources: { title: string; url: string | null }[]
  toolsUsed: string[]
  provider: string | null
  model: string | null
  logId: string | null
  debug?: { why: string; usedEmbedding: boolean; errors: string[] }
}
export type AssistantOptions = {
  db: SqlDriver
  /** Encrypts stored API keys and MCP headers. */
  secretKey: string
  /** Called with the current settings, so an admin can change engine at runtime. Null means keywords only. */
  embedding?: (s: Settings) => EmbeddingEngine | null
  ai?: WorkersAiBinding | null
  /** Local development only: lets MCP connections reach localhost and plain http. */
  allowPrivateMcp?: boolean
  /** Extra instructions from the host application, such as the site name. */
  hostInstructions?: () => Promise<string> | string
}

const safeUrl = (u: string | null) =>
  u && (u.startsWith("/") || u.startsWith("https://")) && !u.startsWith("//")
    ? u
    : null
const toolSlug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20) || "mcp"

const allows = (audience: Audience, role: Role) =>
  audience === "public" ||
  role === "admin" ||
  (audience === "user" && role === "user")

export const createAssistant = (opts: AssistantOptions) => {
  const store = createStore(opts.db, opts.secretKey)
  let cached: {
    version: string
    model: string | null
    index: SearchIndex
  } | null = null

  const engineFor = (s: Settings) =>
    s.embeddingEngine === "off" ? null : (opts.embedding?.(s) ?? null)

  const getIndex = async (model: string | null) => {
    const version = await store.indexVersion()
    if (cached && cached.version === version && cached.model === model)
      return cached.index
    const index = buildIndex(await store.loadIndex(), model)
    cached = { version, model, index }
    return index
  }

  const embedQuery = async (
    engine: EmbeddingEngine | null,
    q: string,
    errors: string[],
  ) => {
    if (!engine) return null
    try {
      const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("timed out")), QUERY_EMBED_TIMEOUT_MS)
      })
      const [v] = await Promise.race([engine.embed([q]), timeout])
      return v ?? null
    } catch (e) {
      // Search carries on with keywords, which is why this is a note and not a failure.
      errors.push(`embedding: ${e instanceof Error ? e.message : String(e)}`)
      return null
    }
  }

  const runSearch = async (
    s: Settings,
    question: string,
    role: Audience,
    errors: string[],
    page: string | null = null,
  ): Promise<SearchResult> => {
    if (!s.usePassages)
      return {
        hits: [],
        confident: false,
        strong: false,
        why: "passages off",
        usedEmbedding: false,
      }
    const engine = engineFor(s)
    const [index, vec] = await Promise.all([
      getIndex(engine?.model ?? null),
      embedQuery(engine, question, errors),
    ])
    return search(index, question, role, s, vec, page)
  }

  const liveProviders = async (s: Settings) => {
    const out: Provider[] = []
    for (const cfg of s.providers) {
      if (!cfg.enabled) continue
      const p = await buildProvider(cfg, store, { ai: opts.ai })
      if (p) out.push(p)
    }
    return out
  }

  const target = async (
    c: Pick<McpConnection, "id" | "url" | "timeoutMs">,
  ): Promise<McpTarget> => ({
    url: c.url,
    headers: parseHeaderLines((await store.getSecret(`mcp:${c.id}`)) ?? ""),
    timeoutMs: c.timeoutMs,
    allowPrivate: !!opts.allowPrivateMcp,
  })

  /** The tools this person may use right now, named so two servers can never collide. */
  const toolsFor = async (role: Role) => {
    const connections = (await store.listConnections()).filter(
      (c) => c.enabled && allows(c.audience, role),
    )
    const tools: ToolDef[] = []
    const route = new Map<string, { connection: McpConnection; tool: string }>()
    for (const c of connections) {
      for (const t of c.tools) {
        if (!t.enabled) continue
        const name =
          `${toolSlug(c.name)}__${t.name.replace(/[^a-zA-Z0-9_-]/g, "_")}`.slice(
            0,
            64,
          )
        tools.push({
          name,
          description: t.description,
          inputSchema: t.inputSchema,
        })
        route.set(name, { connection: c, tool: t.name })
      }
    }
    return {
      tools,
      route,
      connections: connections.filter((c) => c.tools.some((t) => t.enabled)),
    }
  }

  const finish = async (
    who: Who,
    question: string,
    conversation: string | null | undefined,
    started: number,
    r: Omit<Reply, "logId">,
    tokens: { in: number; out: number },
    s: Settings,
    errors: string[],
    context: { visitor?: Visitor | null; page?: string | null },
  ): Promise<Reply> => {
    const logId = await store
      .writeLog({
        visitorId: context.visitor?.id ?? null,
        page: context.page ?? null,
        location: context.visitor ? locationLabel(context.visitor) : null,
        conversation,
        who: context.visitor?.name ?? who.name ?? who.id ?? null,
        role: who.role,
        question,
        answer: r.text,
        route: r.route,
        provider: r.provider,
        model: r.model,
        tokensIn: tokens.in,
        tokensOut: tokens.out,
        ms: Date.now() - started,
        tools: r.toolsUsed,
        sources: r.sources.map((x) => x.title),
        error: errors.join("; ") || null,
      })
      .catch(() => null)
    if (Math.random() < 0.01)
      void store.pruneLogs(s.logRetentionDays).catch(() => null)
    return { ...r, logId }
  }

  /** What this person can ask about, in words, from the content they are allowed to see. */
  const topicsFor = async (s: Settings, role: Role) => {
    if (s.topics) return s.topics
    const allowed =
      role === "admin"
        ? ["public", "user", "admin"]
        : role === "user"
          ? ["public", "user"]
          : ["public"]
    const lead = (x: { title: string }) => {
      const i = LEAD_TOPICS.findIndex((re) => re.test(x.title))
      return i < 0 ? LEAD_TOPICS.length : i
    }
    const titles = (await store.listSources())
      .filter(
        (x) =>
          x.enabled &&
          allowed.includes(x.audience) &&
          x.title.length <= 40 &&
          !NOT_A_TOPIC.test(x.title) &&
          !x.origin?.startsWith("/blog"),
      )
      .sort((x, y) => lead(x) - lead(y))
      .slice(0, TOPICS_SHOWN)
      .map((x) => x.title)
    return titles.length > 1
      ? `${titles.slice(0, -1).join(", ")} and ${titles[titles.length - 1]}`
      : (titles[0] ?? "")
  }

  const sourcesOf = (hits: Hit[]) => {
    const seen = new Set<string>()
    return hits.flatMap((h) => {
      if (seen.has(h.title)) return []
      seen.add(h.title)
      return [{ title: h.title, url: safeUrl(h.origin) }]
    })
  }

  return {
    store,
    engineFor,
    getSettings: () => store.getSettings(),

    /** Answers one question. Every path through here is logged. */
    async chat(input: {
      question: string
      who: Who
      history?: { role: "user" | "assistant"; content: string }[]
      conversation?: string | null
      debug?: boolean
      visitor?: Visitor | null
      page?: string | null
    }): Promise<Reply> {
      const started = Date.now()
      const s = await store.getSettings()
      const question = input.question.trim().slice(0, 2000)
      const errors: string[] = []
      const base = { sources: [], toolsUsed: [], provider: null, model: null }
      // A known visitor's history comes from the server, so a browser cannot put words in the assistant's mouth.
      const stored = input.visitor
        ? await store.visitorHistory(input.visitor.id, MAX_HISTORY)
        : null
      const turnsWithin = (ms: number) =>
        stored
          ? stored
              .filter((h) => Date.now() - Date.parse(h.at) < ms)
              .flatMap((h) => [
                { role: "user" as const, content: h.question },
                { role: "assistant" as const, content: h.answer },
              ])
          : (input.history ?? [])
      const earlier = turnsWithin(HISTORY_FRESH_MS)
      const recent = turnsWithin(REPEAT_WINDOW_MS)
      const said = recent
        .filter((m) => m.role === "assistant")
        .map((m) => m.content)
      const fill = async () => ({
        name: input.visitor?.name ?? input.who.name,
        assistant: s.assistantName,
        topics: await topicsFor(s, input.who.role),
      })
      const done = async (
        reply: Omit<Reply, "logId">,
        tokens = { in: 0, out: 0 },
        why = "",
        usedEmbedding = false,
      ) => {
        // The same "I don't know" twice in a row reads like a stuck record.
        let r = reply
        if (
          r.route === "honesty" &&
          r.text === s.honestyReply &&
          said.includes(s.honestyReply)
        ) {
          const f = await fill()
          const next = pickLine(
            s.honestyFollowups
              .split(/\r?\n/)
              .map((l) => l.trim())
              .filter(Boolean)
              .map((l) => fillTemplate(l, f))
              .filter(Boolean),
            said,
            true,
          )
          if (next) r = { ...r, text: next }
        }
        return finish(
          input.who,
          question,
          input.conversation,
          started,
          {
            ...r,
            debug: input.debug ? { why, usedEmbedding, errors } : undefined,
          },
          tokens,
          s,
          errors,
          { visitor: input.visitor, page: input.page },
        )
      }

      if (!canChat(s, input.who.role))
        return { ...base, text: s.honestyReply, route: "off", logId: null }
      if (matchesBlockedTopic(question, s.blockedTopics))
        return done({
          ...base,
          text: s.blockedReply || s.honestyReply,
          route: "blocked",
        })
      if (looksLikeInjection(question))
        return done({ ...base, text: s.honestyReply, route: "guarded" })

      const usage = async (
        pr: Provider,
        r: Parameters<Parameters<typeof runChain>[2]>[1],
      ) => {
        await store
          .recordUsage(pr.id, {
            ok: r.ok,
            tokensIn: r.result?.inputTokens,
            tokensOut: r.result?.outputTokens,
            error: r.error,
          })
          .catch(() => null)
      }

      const smallTalk = s.smallTalk.enabled
        ? matchSmallTalk(s.smallTalk.kinds, question)
        : null
      if (smallTalk) {
        const answer = await replyToSmallTalk(smallTalk)
        return done(
          answer.reply,
          answer.tokens,
          `small talk: ${smallTalk.label}`,
        )
      }

      async function replyToSmallTalk(k: SmallTalkKind) {
        const before = recent.filter(
          (m) =>
            m.role === "user" &&
            matchSmallTalk(s.smallTalk.kinds, m.content)?.id === k.id,
        ).length
        const f = await fill()
        const line = smallTalkLine(k, before, said, f) ?? NO_TOPICS_LINE
        const plain = { ...base, text: line, route: "smalltalk" as const }
        const tokens = { in: 0, out: 0 }
        const spentToday = (await store.usageToday()).reduce(
          (n, u) => n + u.tokensIn + u.tokensOut,
          0,
        )
        const canSpend =
          s.smallTalk.useModel &&
          s.aiWording &&
          (s.dailyTokenBudget <= 0 || spentToday < s.dailyTokenBudget)
        const models = canSpend
          ? (await liveProviders(s)).filter((p) => p.type !== "mock")
          : []
        if (!models.length) return { reply: plain, tokens }
        try {
          const system = [
            s.persona,
            visitorContext(input.visitor ?? null, input.page ?? null),
            FIXED_RULES,
            s.rules.trim()
              ? `Rules from the site owner:\n${s.rules.trim()}`
              : "",
            smallTalkPrompt(k, before, line, f.topics),
          ]
            .filter(Boolean)
            .join("\n\n")
          const { provider: p, result } = await runChain(
            models,
            {
              system,
              messages: [
                ...recent.slice(-MAX_HISTORY).map(
                  (m) =>
                    ({
                      role: m.role,
                      content: m.content.slice(0, 2000),
                    }) as ChatMessage,
                ),
                { role: "user", content: question },
              ],
              tools: [],
              maxTokens: Math.min(s.maxTokens, SMALL_TALK_MAX_TOKENS),
              timeoutMs: PROVIDER_TIMEOUT_MS,
            },
            usage,
          )
          tokens.in = result.inputTokens
          tokens.out = result.outputTokens
          const text = scrubSecrets(result.text).trim()
          // A refusal, a leak, or a repeat of what was just said falls back to the owner's own line.
          if (
            result.refused ||
            !text ||
            said.includes(text) ||
            leaksInstructions(text, [s.persona, s.rules, FIXED_RULES])
          )
            return { reply: plain, tokens }
          return {
            reply: { ...plain, text, provider: p.id, model: p.model },
            tokens,
          }
        } catch (e) {
          errors.push(e instanceof Error ? e.message : "model failed")
          return { reply: plain, tokens }
        }
      }

      const found = await runSearch(
        s,
        question,
        input.who.role,
        errors,
        input.page ?? null,
      )
      const passages = found.confident ? found.hits : []
      // The model reads every passage, but only those close to the best one are cited to the reader.
      const best = passages[0]?.score ?? 0
      const sources = sourcesOf(
        passages.filter((h, i) => i === 0 || h.score >= best * CITE_WITHIN),
      )
      const quote = () =>
        found.strong && found.hits[0]
          ? {
              ...base,
              text: found.hits[0].text,
              route: "quote" as const,
              sources: sourcesOf(found.hits.slice(0, 1)),
            }
          : null

      const today = await store.usageToday()
      const spent = today.reduce((n, u) => n + u.tokensIn + u.tokensOut, 0)
      const overBudget = s.dailyTokenBudget > 0 && spent >= s.dailyTokenBudget
      const providers = s.aiWording && !overBudget ? await liveProviders(s) : []
      const {
        tools,
        route: toolRoute,
        connections,
      } = await toolsFor(input.who.role)
      if (overBudget) errors.push("over the daily token budget")

      // No model to ask: a strong match is quoted as it stands, and anything else gets the honest reply.
      if (!providers.length) {
        return done(
          quote() ?? { ...base, text: s.honestyReply, route: "honesty" },
          undefined,
          found.why,
          found.usedEmbedding,
        )
      }
      // Nothing to answer from and general answers are off, so a model call could only guess.
      if (!passages.length && !tools.length && !s.allowGeneral) {
        return done(
          { ...base, text: s.honestyReply, route: "honesty" },
          undefined,
          found.why,
          found.usedEmbedding,
        )
      }

      const host = (await opts.hostInstructions?.()) ?? ""
      const system = buildSystemPrompt(
        s,
        passages,
        connections,
        host,
        visitorContext(input.visitor ?? null, input.page ?? null),
      )
      const messages: ChatMessage[] = [
        ...earlier.slice(-MAX_HISTORY).map(
          (m) =>
            ({
              role: m.role,
              content: m.content.slice(0, 2000),
            }) as ChatMessage,
        ),
        { role: "user", content: question },
      ]
      const tokens = { in: 0, out: 0 }
      const toolsUsed: string[] = []
      let provider: Provider | null = null
      try {
        for (let step = 0; step <= s.maxToolSteps; step++) {
          const { provider: p, result } = await runChain(
            providers,
            {
              system,
              messages,
              // The final step offers no tools, so a looping model has to answer.
              tools: step < s.maxToolSteps ? tools : [],
              maxTokens: s.maxTokens,
              timeoutMs: PROVIDER_TIMEOUT_MS,
            },
            async (pr, r) => {
              await store
                .recordUsage(pr.id, {
                  ok: r.ok,
                  tokensIn: r.result?.inputTokens,
                  tokensOut: r.result?.outputTokens,
                  error: r.error,
                })
                .catch(() => null)
            },
            provider?.id,
          )
          provider = p
          tokens.in += result.inputTokens
          tokens.out += result.outputTokens
          if (result.refused) {
            return done(
              {
                ...base,
                text: s.honestyReply,
                route: "honesty",
                provider: p.id,
                model: p.model,
              },
              tokens,
              "the model declined",
              found.usedEmbedding,
            )
          }
          if (!result.toolCalls.length) {
            let text = scrubSecrets(result.text).trim()
            if (leaksInstructions(text, [s.persona, s.rules, FIXED_RULES])) {
              errors.push("reply repeated the instructions")
              text = s.honestyReply
            }
            const honest = !text || text === s.honestyReply
            return done(
              {
                text: text || s.honestyReply,
                route: honest ? "honesty" : toolsUsed.length ? "tools" : "ai",
                sources: honest ? [] : sources,
                toolsUsed,
                provider: p.id,
                model: p.model,
              },
              tokens,
              found.why,
              found.usedEmbedding,
            )
          }
          messages.push({
            role: "assistant",
            content: result.text,
            toolCalls: result.toolCalls,
            raw: result.raw,
          })
          for (const call of result.toolCalls) {
            const r = toolRoute.get(call.name)
            let content: string
            let isError = false
            if (!r) {
              // A model cannot reach a tool that was not offered to this person, whatever it asks for.
              content = "That tool is not available."
              isError = true
            } else {
              try {
                const out = await callMcpTool(
                  await target(r.connection),
                  r.tool,
                  call.args,
                )
                content = scrubSecrets(out.text)
                isError = out.isError
                toolsUsed.push(`${r.connection.name}: ${r.tool}`)
                await store
                  .markConnection(r.connection.id, null)
                  .catch(() => null)
              } catch (e) {
                content = "The tool could not be reached."
                isError = true
                const message = e instanceof Error ? e.message : String(e)
                errors.push(`${r.connection.name}: ${message}`)
                await store
                  .markConnection(r.connection.id, message.slice(0, 300))
                  .catch(() => null)
              }
            }
            messages.push({
              role: "tool",
              toolCallId: call.id,
              name: call.name,
              content,
              isError,
            })
          }
        }
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e))
      }
      // Every provider failed. The site still answers when it can.
      return done(
        quote() ?? { ...base, text: s.honestyReply, route: "honesty" },
        tokens,
        found.why,
        found.usedEmbedding,
      )
    },

    async testSearch(question: string, role: Audience) {
      const s = await store.getSettings()
      const errors: string[] = []
      const result = await runSearch(s, question, role, errors)
      return {
        ...result,
        errors,
        blocked: matchesBlockedTopic(question, s.blockedTopics),
      }
    },

    /** The exact instructions a model would receive for this question. */
    async promptPreview(question: string, role: Role) {
      const s = await store.getSettings()
      const found = await runSearch(s, question || "example", role, [])
      const { connections, tools } = await toolsFor(role)
      return {
        system: buildSystemPrompt(
          s,
          found.confident ? found.hits : [],
          connections,
          (await opts.hostInstructions?.()) ?? "",
        ),
        tools: tools.map((t) => t.name),
      }
    },

    /** Brings the host's pages up to date. Unchanged ones keep their embeddings, and an admin's on or off stays. */
    async syncSite(
      docs: {
        id: string
        title: string
        text: string
        origin?: string | null
        audience?: Audience
      }[],
    ) {
      const keep = new Set(docs.map((d) => d.id))
      const existing = await store.listSources()
      const byId = new Map(existing.map((x) => [x.id, x]))
      const removed = existing.filter(
        (x) => x.kind === "site" && !keep.has(x.id),
      )
      for (const x of removed) await store.deleteSource(x.id)
      const current = await store.chunkTexts()
      let changed = 0
      for (const d of docs) {
        const was = byId.get(d.id)
        const same =
          was &&
          was.title === d.title &&
          was.origin === (d.origin ?? null) &&
          current.get(d.id) === JSON.stringify(chunkText(d.text))
        if (same) continue
        await this.addText({
          ...d,
          kind: "site",
          enabled: was?.enabled ?? true,
          audience: was?.audience ?? d.audience,
        })
        changed++
      }
      return { imported: docs.length, changed, removed: removed.length }
    },

    async addText(input: {
      id?: string
      title: string
      text: string
      kind?: string
      origin?: string | null
      audience?: Audience
      enabled?: boolean
    }) {
      const chunks = chunkText(input.text)
      const id = input.id ?? crypto.randomUUID()
      await store.putSource(
        {
          id,
          title: input.title,
          kind: input.kind ?? "text",
          origin: input.origin ?? null,
          audience: input.audience ?? "public",
          enabled: input.enabled ?? true,
        },
        chunks,
      )
      return { id, chunks: chunks.length }
    },

    /** Embeds the next few passages. Called repeatedly, so no single request has to do them all. */
    async embedPending(limit = 8) {
      const s = await store.getSettings()
      const engine = engineFor(s)
      if (!engine)
        return { done: 0, remaining: 0, error: "Semantic search is off" }
      const rows = await store.chunksToEmbed(engine.model, limit)
      if (!rows.length) return { done: 0, remaining: 0, error: null }
      try {
        const vectors = await engine.embed(
          rows.map((r) => passagePrefix(r.title, r.heading, r.text)),
        )
        for (const [i, r] of rows.entries())
          await store.saveVector(r.id, encodeVector(vectors[i]), engine.model)
        await store.bumpIndex()
      } catch (e) {
        return {
          done: 0,
          remaining: rows.length,
          error: e instanceof Error ? e.message : String(e),
        }
      }
      const c = await store.counts(engine.model)
      return {
        done: rows.length,
        remaining: c.passages - c.embedded,
        error: null,
      }
    },

    /** One real request to a provider, to prove its key and model work. */
    async testProvider(id: string) {
      const s = await store.getSettings()
      const cfg = s.providers.find((p) => p.id === id)
      if (!cfg) return { ok: false, detail: "Unknown provider" }
      const p = await buildProvider(cfg, store, { ai: opts.ai })
      if (!p) return { ok: false, detail: "It needs an API key first." }
      const t = Date.now()
      try {
        const r = await p.chat({
          system: "Reply with the single word: ok",
          messages: [{ role: "user", content: "ping" }],
          tools: [],
          maxTokens: 64,
          timeoutMs: PROVIDER_TIMEOUT_MS,
        })
        return {
          ok: true,
          detail: `Answered in ${Date.now() - t} ms: ${r.text.slice(0, 60)}`,
        }
      } catch (e) {
        return {
          ok: false,
          detail: e instanceof Error ? e.message.slice(0, 300) : String(e),
        }
      }
    },
    keyName,

    async refreshConnection(id: string) {
      const c = await store.getConnection(id)
      if (!c) throw new Error("Unknown connection")
      try {
        const tools = await listMcpTools(await target(c), c.tools)
        await store.saveConnection({ ...c, tools })
        await store.markConnection(id, null)
        return { ok: true as const, tools }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        await store.markConnection(id, message.slice(0, 300))
        return { ok: false as const, error: message }
      }
    },
    async callTool(id: string, tool: string, args: Record<string, unknown>) {
      const c = await store.getConnection(id)
      if (!c) throw new Error("Unknown connection")
      return callMcpTool(await target(c), tool, args)
    },
  }
}
export type Assistant = ReturnType<typeof createAssistant>
