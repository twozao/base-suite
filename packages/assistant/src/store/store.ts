import { open, seal, sha256 } from "../crypto"
import { parseSettings, settingsSchema, type Settings } from "../settings"
import type { SqlDriver, SqlRow } from "./driver"

const SCHEMA = [
  `create table if not exists assistant_settings (key text primary key, value text not null)`,
  `create table if not exists assistant_secrets (name text primary key, box text not null)`,
  `create table if not exists assistant_sources (
    id text primary key, title text not null, kind text not null, origin text, audience text not null,
    enabled integer not null, updated_at text not null)`,
  `create table if not exists assistant_chunks (
    id text primary key, source_id text not null, ord integer not null, heading text not null, text text not null,
    vec text, vec_model text)`,
  `create index if not exists assistant_chunks_source on assistant_chunks (source_id, ord)`,
  `create table if not exists assistant_mcp (
    id text primary key, name text not null, url text not null, enabled integer not null, instructions text not null,
    audience text not null, timeout_ms integer not null, tools text not null, last_ok_at text, last_error text,
    updated_at text not null)`,
  `create table if not exists assistant_logs (
    id text primary key, created_at text not null, conversation text, who text, role text not null, question text not null,
    answer text not null, route text not null, provider text, model text, tokens_in integer not null,
    tokens_out integer not null, ms integer not null, tools text not null, sources text not null, error text, rating integer)`,
  `create index if not exists assistant_logs_created on assistant_logs (created_at)`,
  `create table if not exists assistant_usage (
    day text not null, provider text not null, ok integer not null, fail integer not null, tokens_in integer not null,
    tokens_out integer not null, last_error text, last_error_at text, primary key (day, provider))`,
]

// Added after the first release; each runs once, and a column that already exists is simply skipped.
const UPGRADES = [
  `alter table assistant_logs add column visitor_id text`,
  `alter table assistant_logs add column page text`,
  `alter table assistant_logs add column location text`,
  `create index if not exists assistant_logs_visitor on assistant_logs (visitor_id, created_at)`,
]
const VISITORS = [
  `create table if not exists assistant_visitors (
    id text primary key, token_hash text unique, user_ref text unique, name text, email text, phone text,
    typed_location text, country text, region text, city text, timezone text, language text,
    latitude text, longitude text, last_page text, first_seen text not null, last_seen text not null)`,
  `create index if not exists assistant_visitors_seen on assistant_visitors (last_seen)`,
]

export type Audience = "public" | "user" | "admin"
export type Visitor = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  typedLocation: string | null
  country: string | null
  region: string | null
  city: string | null
  timezone: string | null
  language: string | null
  latitude: string | null
  longitude: string | null
  lastPage: string | null
  firstSeen: string
  lastSeen: string
}
export type VisitorDetails = Partial<
  Pick<
    Visitor,
    | "name"
    | "email"
    | "phone"
    | "typedLocation"
    | "country"
    | "region"
    | "city"
    | "timezone"
    | "language"
    | "latitude"
    | "longitude"
    | "lastPage"
  >
>
export type Source = {
  id: string
  title: string
  kind: string
  origin: string | null
  audience: Audience
  enabled: boolean
  updatedAt: string
  chunks?: number
  embedded?: number
}
export type ChunkRow = {
  id: string
  sourceId: string
  ord: number
  heading: string
  text: string
  vec: string | null
  vecModel: string | null
}
export type McpTool = {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  /** True when the server says the tool only reads. Anything else stays off until an admin allows it. */
  readOnly: boolean
  enabled: boolean
}
export type McpConnection = {
  id: string
  name: string
  url: string
  enabled: boolean
  instructions: string
  audience: Audience
  timeoutMs: number
  tools: McpTool[]
  lastOkAt: string | null
  lastError: string | null
}
export type LogEntry = {
  conversation?: string | null
  who?: string | null
  role: string
  question: string
  answer: string
  route: string
  provider?: string | null
  model?: string | null
  tokensIn: number
  tokensOut: number
  ms: number
  tools: string[]
  sources: string[]
  error?: string | null
  visitorId?: string | null
  page?: string | null
  location?: string | null
}

const now = () => new Date().toISOString()
const num = (v: unknown) => Number(v ?? 0)
const str = (v: unknown) => (v === null || v === undefined ? null : String(v))

export const createStore = (db: SqlDriver, secretKey: string) => {
  let ready: Promise<void> | null = null
  const init = () =>
    (ready ??= (async () => {
      for (const s of [...SCHEMA, ...VISITORS]) await db.run(s)
      for (const s of UPGRADES) await db.run(s).catch(() => null)
    })())
  const all = async (sql: string, p?: unknown[]) => {
    await init()
    return db.all(sql, p)
  }
  const run = async (sql: string, p?: unknown[]) => {
    await init()
    return db.run(sql, p)
  }
  const upsert = (
    table: string,
    key: string,
    valueCol: string,
    k: string,
    v: string,
  ) =>
    run(
      `insert into ${table} (${key}, ${valueCol}) values (?, ?) on conflict (${key}) do update set ${valueCol} = excluded.${valueCol}`,
      [k, v],
    )
  const toVisitor = (r: SqlRow): Visitor => ({
    id: String(r.id),
    name: str(r.name),
    email: str(r.email),
    phone: str(r.phone),
    typedLocation: str(r.typed_location),
    country: str(r.country),
    region: str(r.region),
    city: str(r.city),
    timezone: str(r.timezone),
    language: str(r.language),
    latitude: str(r.latitude),
    longitude: str(r.longitude),
    lastPage: str(r.last_page),
    firstSeen: String(r.first_seen),
    lastSeen: String(r.last_seen),
  })
  const toSource = (r: SqlRow): Source => ({
    id: String(r.id),
    title: String(r.title),
    kind: String(r.kind),
    origin: str(r.origin),
    audience: String(r.audience) as Audience,
    enabled: num(r.enabled) === 1,
    updatedAt: String(r.updated_at),
    chunks: r.chunks === undefined ? undefined : num(r.chunks),
    embedded: r.embedded === undefined ? undefined : num(r.embedded),
  })
  const toConnection = (r: SqlRow): McpConnection => {
    let tools: McpTool[] = []
    try {
      tools = JSON.parse(String(r.tools))
    } catch {
      /* a damaged list reads as no tools */
    }
    return {
      id: String(r.id),
      name: String(r.name),
      url: String(r.url),
      enabled: num(r.enabled) === 1,
      instructions: String(r.instructions),
      audience: String(r.audience) as Audience,
      timeoutMs: num(r.timeout_ms),
      tools,
      lastOkAt: str(r.last_ok_at),
      lastError: str(r.last_error),
    }
  }

  return {
    async getSettings(): Promise<Settings> {
      const [r] = await all(
        `select value from assistant_settings where key = 'settings'`,
      )
      try {
        return parseSettings(r ? JSON.parse(String(r.value)) : {})
      } catch {
        return parseSettings({})
      }
    },
    async saveSettings(patch: Partial<Settings>) {
      const next = settingsSchema.parse({
        ...(await this.getSettings()),
        ...patch,
      })
      await upsert(
        "assistant_settings",
        "key",
        "value",
        "settings",
        JSON.stringify(next),
      )
      return next
    },

    async setSecret(name: string, plain: string | null) {
      if (!plain)
        return run(`delete from assistant_secrets where name = ?`, [name])
      return upsert(
        "assistant_secrets",
        "name",
        "box",
        name,
        await seal(plain, secretKey, name),
      )
    },
    async getSecret(name: string) {
      const [r] = await all(
        `select box from assistant_secrets where name = ?`,
        [name],
      )
      return r ? open(String(r.box), secretKey, name) : null
    },
    async hasSecret(name: string) {
      return (
        (
          await all(`select 1 as x from assistant_secrets where name = ?`, [
            name,
          ])
        ).length > 0
      )
    },

    async listSources(): Promise<Source[]> {
      const rows = await all(
        `select s.*, (select count(*) from assistant_chunks c where c.source_id = s.id) as chunks,
         (select count(*) from assistant_chunks c where c.source_id = s.id and c.vec is not null) as embedded
         from assistant_sources s order by s.updated_at desc`,
      )
      return rows.map(toSource)
    },
    /** Each source's passages, in the shape chunkText returns, to tell whether its text changed. */
    async chunkTexts() {
      const rows = await all(
        `select source_id, heading, text from assistant_chunks order by source_id, ord`,
      )
      const out = new Map<string, { heading: string; text: string }[]>()
      for (const r of rows) {
        const id = String(r.source_id)
        out.set(id, [
          ...(out.get(id) ?? []),
          { heading: String(r.heading), text: String(r.text) },
        ])
      }
      return new Map([...out].map(([id, c]) => [id, JSON.stringify(c)]))
    },
    /** Replaces a source and its passages; passages lose their embeddings until the next embed run. */
    async putSource(
      s: {
        id: string
        title: string
        kind: string
        origin?: string | null
        audience: Audience
        enabled: boolean
      },
      chunks: { heading: string; text: string }[],
    ) {
      await run(
        `insert into assistant_sources (id, title, kind, origin, audience, enabled, updated_at) values (?, ?, ?, ?, ?, ?, ?)
         on conflict (id) do update set title = excluded.title, kind = excluded.kind, origin = excluded.origin,
         audience = excluded.audience, enabled = excluded.enabled, updated_at = excluded.updated_at`,
        [
          s.id,
          s.title,
          s.kind,
          s.origin ?? null,
          s.audience,
          s.enabled ? 1 : 0,
          now(),
        ],
      )
      await run(`delete from assistant_chunks where source_id = ?`, [s.id])
      for (const [i, c] of chunks.entries()) {
        await run(
          `insert into assistant_chunks (id, source_id, ord, heading, text) values (?, ?, ?, ?, ?)`,
          [`${s.id}:${i}`, s.id, i, c.heading, c.text],
        )
      }
      await this.bumpIndex()
    },
    async setSourceEnabled(id: string, enabled: boolean, audience?: Audience) {
      await run(
        `update assistant_sources set enabled = ?, audience = coalesce(?, audience), updated_at = ? where id = ?`,
        [enabled ? 1 : 0, audience ?? null, now(), id],
      )
      await this.bumpIndex()
    },
    async deleteSource(id: string) {
      await run(`delete from assistant_chunks where source_id = ?`, [id])
      await run(`delete from assistant_sources where id = ?`, [id])
      await this.bumpIndex()
    },
    async sourceChunks(id: string) {
      return all(
        `select id, heading, text, vec is not null as embedded from assistant_chunks where source_id = ? order by ord limit 500`,
        [id],
      )
    },
    async bumpIndex() {
      await upsert(
        "assistant_settings",
        "key",
        "value",
        "index_version",
        crypto.randomUUID(),
      )
    },
    async indexVersion() {
      const [r] = await all(
        `select value from assistant_settings where key = 'index_version'`,
      )
      return r ? String(r.value) : "0"
    },
    /** Every searchable passage with its source. Loaded once per index version. */
    async loadIndex() {
      const rows = await all(
        `select c.id, c.source_id, c.heading, c.text, c.vec, c.vec_model, s.title, s.audience, s.origin
         from assistant_chunks c join assistant_sources s on s.id = c.source_id where s.enabled = 1`,
      )
      return rows.map((r) => ({
        id: String(r.id),
        sourceId: String(r.source_id),
        heading: String(r.heading),
        text: String(r.text),
        vec: str(r.vec),
        vecModel: str(r.vec_model),
        title: String(r.title),
        audience: String(r.audience) as Audience,
        origin: str(r.origin),
      }))
    },
    async chunksToEmbed(model: string, limit: number) {
      const rows = await all(
        `select c.id, c.heading, c.text, s.title from assistant_chunks c join assistant_sources s on s.id = c.source_id
         where c.vec is null or c.vec_model is null or c.vec_model <> ? order by c.id limit ?`,
        [model, limit],
      )
      return rows.map((r) => ({
        id: String(r.id),
        heading: String(r.heading),
        text: String(r.text),
        title: String(r.title),
      }))
    },
    async saveVector(id: string, vec: string, model: string) {
      await run(
        `update assistant_chunks set vec = ?, vec_model = ? where id = ?`,
        [vec, model, id],
      )
    },
    async counts(model: string) {
      const [r] = await all(
        `select count(*) as total, sum(case when vec is not null and vec_model = ? then 1 else 0 end) as embedded from assistant_chunks`,
        [model],
      )
      return { passages: num(r?.total), embedded: num(r?.embedded) }
    },

    async listConnections(): Promise<McpConnection[]> {
      return (await all(`select * from assistant_mcp order by name`)).map(
        toConnection,
      )
    },
    async getConnection(id: string) {
      const [r] = await all(`select * from assistant_mcp where id = ?`, [id])
      return r ? toConnection(r) : null
    },
    async saveConnection(c: Omit<McpConnection, "lastOkAt" | "lastError">) {
      await run(
        `insert into assistant_mcp (id, name, url, enabled, instructions, audience, timeout_ms, tools, updated_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?)
         on conflict (id) do update set name = excluded.name, url = excluded.url, enabled = excluded.enabled,
         instructions = excluded.instructions, audience = excluded.audience, timeout_ms = excluded.timeout_ms,
         tools = excluded.tools, updated_at = excluded.updated_at`,
        [
          c.id,
          c.name,
          c.url,
          c.enabled ? 1 : 0,
          c.instructions,
          c.audience,
          c.timeoutMs,
          JSON.stringify(c.tools),
          now(),
        ],
      )
    },
    async markConnection(id: string, error: string | null) {
      await run(
        error
          ? `update assistant_mcp set last_error = ? where id = ?`
          : `update assistant_mcp set last_error = ?, last_ok_at = '${now()}' where id = ?`,
        [error, id],
      )
    },
    async deleteConnection(id: string) {
      await run(`delete from assistant_mcp where id = ?`, [id])
      await this.setSecret(`mcp:${id}`, null)
    },

    async writeLog(l: LogEntry) {
      const id = crypto.randomUUID()
      await run(
        `insert into assistant_logs (id, created_at, conversation, who, role, question, answer, route, provider, model,
         tokens_in, tokens_out, ms, tools, sources, error, visitor_id, page, location) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          now(),
          l.conversation ?? null,
          l.who ?? null,
          l.role,
          l.question.slice(0, 4000),
          l.answer.slice(0, 8000),
          l.route,
          l.provider ?? null,
          l.model ?? null,
          l.tokensIn,
          l.tokensOut,
          l.ms,
          JSON.stringify(l.tools),
          JSON.stringify(l.sources),
          l.error ?? null,
          l.visitorId ?? null,
          l.page ?? null,
          l.location ?? null,
        ],
      )
      return id
    },
    async rateLog(id: string, rating: 1 | -1) {
      await run(
        `update assistant_logs set rating = ? where id = ? and rating is null`,
        [rating, id],
      )
    },
    async listLogs(opts: {
      route?: string
      q?: string
      visitorId?: string
      limit: number
      offset: number
    }) {
      const where: string[] = []
      const params: unknown[] = []
      if (opts.route) {
        where.push("route = ?")
        params.push(opts.route)
      }
      if (opts.visitorId) {
        where.push("visitor_id = ?")
        params.push(opts.visitorId)
      }
      if (opts.q) {
        where.push("(lower(question) like ? or lower(answer) like ?)")
        const term = `%${opts.q.toLowerCase()}%`
        params.push(term, term)
      }
      return all(
        `select * from assistant_logs ${where.length ? `where ${where.join(" and ")}` : ""} order by created_at desc limit ? offset ?`,
        [...params, opts.limit, opts.offset],
      )
    },
    async insights(days: number) {
      const from = new Date(Date.now() - days * 86_400_000).toISOString()
      const routes = await all(
        `select route, count(*) as n, sum(ms) as ms from assistant_logs where created_at >= ? group by route`,
        [from],
      )
      const perDay = await all(
        `select substr(created_at, 1, 10) as day, count(*) as n, sum(tokens_in) as tokens_in, sum(tokens_out) as tokens_out
         from assistant_logs where created_at >= ? group by substr(created_at, 1, 10) order by day`,
        [from],
      )
      const unanswered = await all(
        `select question, count(*) as n from assistant_logs where created_at >= ? and route = 'honesty'
         group by question order by n desc limit 15`,
        [from],
      )
      const pages = await all(
        `select page, count(*) as n from assistant_logs where created_at >= ? and page is not null
         group by page order by n desc limit 10`,
        [from],
      )
      const ratings = await all(
        `select sum(case when rating = 1 then 1 else 0 end) as up, sum(case when rating = -1 then 1 else 0 end) as down
         from assistant_logs where created_at >= ?`,
        [from],
      )
      return {
        routes: routes.map((r) => ({
          route: String(r.route),
          n: num(r.n),
          avgMs: num(r.n) ? Math.round(num(r.ms) / num(r.n)) : 0,
        })),
        perDay: perDay.map((r) => ({
          day: String(r.day),
          n: num(r.n),
          tokens: num(r.tokens_in) + num(r.tokens_out),
        })),
        unanswered: unanswered.map((r) => ({
          question: String(r.question),
          n: num(r.n),
        })),
        ratings: { up: num(ratings[0]?.up), down: num(ratings[0]?.down) },
        pages: pages.map((r) => ({ page: String(r.page), n: num(r.n) })),
      }
    },
    async findVisitorByToken(token: string) {
      const [r] = await all(
        `select * from assistant_visitors where token_hash = ?`,
        [await sha256(token)],
      )
      return r ? toVisitor(r) : null
    },
    async findVisitorByUser(userRef: string) {
      const [r] = await all(
        `select * from assistant_visitors where user_ref = ?`,
        [userRef],
      )
      return r ? toVisitor(r) : null
    },
    /** Creates a visitor. The token goes to the browser; only its hash is kept, so a database read cannot impersonate anyone. */
    async createVisitor(
      details: VisitorDetails,
      identity: { token?: string; userRef?: string },
    ) {
      const id = crypto.randomUUID()
      const at = now()
      await run(
        `insert into assistant_visitors (id, token_hash, user_ref, first_seen, last_seen) values (?, ?, ?, ?, ?)`,
        [
          id,
          identity.token ? await sha256(identity.token) : null,
          identity.userRef ?? null,
          at,
          at,
        ],
      )
      return this.updateVisitor(id, details)
    },
    /** Saves what is known. A blank value never wipes something already on file. */
    async updateVisitor(id: string, d: VisitorDetails) {
      await run(
        `update assistant_visitors set name = coalesce(?, name), email = coalesce(?, email), phone = coalesce(?, phone),
         typed_location = coalesce(?, typed_location), country = coalesce(?, country), region = coalesce(?, region),
         city = coalesce(?, city), timezone = coalesce(?, timezone), language = coalesce(?, language),
         latitude = coalesce(?, latitude), longitude = coalesce(?, longitude), last_page = coalesce(?, last_page),
         last_seen = ? where id = ?`,
        [
          d.name ?? null,
          d.email ?? null,
          d.phone ?? null,
          d.typedLocation ?? null,
          d.country ?? null,
          d.region ?? null,
          d.city ?? null,
          d.timezone ?? null,
          d.language ?? null,
          d.latitude ?? null,
          d.longitude ?? null,
          d.lastPage ?? null,
          now(),
          id,
        ],
      )
      const [r] = await all(`select * from assistant_visitors where id = ?`, [
        id,
      ])
      return toVisitor(r)
    },
    /** A visitor's own conversation, oldest first. */
    async visitorHistory(id: string, limit: number) {
      const rows = await all(
        `select question, answer, created_at from assistant_logs where visitor_id = ? order by created_at desc limit ?`,
        [id, limit],
      )
      return rows.reverse().map((r) => ({
        question: String(r.question),
        answer: String(r.answer),
        at: String(r.created_at),
      }))
    },
    async listVisitors(opts: { q?: string; limit: number; offset: number }) {
      const term = opts.q ? `%${opts.q.toLowerCase()}%` : null
      const rows = await all(
        `select v.*, (select count(*) from assistant_logs l where l.visitor_id = v.id) as chats
         from assistant_visitors v
         ${term ? "where lower(coalesce(v.name, '')) like ? or lower(coalesce(v.email, '')) like ? or coalesce(v.phone, '') like ?" : ""}
         order by v.last_seen desc limit ? offset ?`,
        [...(term ? [term, term, term] : []), opts.limit, opts.offset],
      )
      return rows.map((r) => ({ ...toVisitor(r), chats: num(r.chats) }))
    },
    /** Removes a person and everything they said, for deletion requests. */
    async deleteVisitor(id: string) {
      await run(`delete from assistant_logs where visitor_id = ?`, [id])
      await run(`delete from assistant_visitors where id = ?`, [id])
    },

    async pruneLogs(days: number) {
      const cutoff = new Date(Date.now() - days * 86_400_000).toISOString()
      await run(`delete from assistant_visitors where last_seen < ?`, [cutoff])
      await run(`delete from assistant_logs where created_at < ?`, [
        new Date(Date.now() - days * 86_400_000).toISOString(),
      ])
    },

    async recordUsage(
      provider: string,
      u: {
        ok: boolean
        tokensIn?: number
        tokensOut?: number
        error?: string | null
      },
    ) {
      const day = now().slice(0, 10)
      await run(
        `insert into assistant_usage (day, provider, ok, fail, tokens_in, tokens_out, last_error, last_error_at)
         values (?, ?, ?, ?, ?, ?, ?, ?)
         on conflict (day, provider) do update set ok = assistant_usage.ok + excluded.ok,
         fail = assistant_usage.fail + excluded.fail, tokens_in = assistant_usage.tokens_in + excluded.tokens_in,
         tokens_out = assistant_usage.tokens_out + excluded.tokens_out,
         last_error = coalesce(excluded.last_error, assistant_usage.last_error),
         last_error_at = coalesce(excluded.last_error_at, assistant_usage.last_error_at)`,
        [
          day,
          provider,
          u.ok ? 1 : 0,
          u.ok ? 0 : 1,
          u.tokensIn ?? 0,
          u.tokensOut ?? 0,
          u.error ?? null,
          u.error ? now() : null,
        ],
      )
    },
    async usageToday() {
      const rows = await all(`select * from assistant_usage where day = ?`, [
        now().slice(0, 10),
      ])
      return rows.map((r) => ({
        provider: String(r.provider),
        ok: num(r.ok),
        fail: num(r.fail),
        tokensIn: num(r.tokens_in),
        tokensOut: num(r.tokens_out),
        lastError: str(r.last_error),
        lastErrorAt: str(r.last_error_at),
      }))
    },
  }
}
export type AssistantStore = ReturnType<typeof createStore>
