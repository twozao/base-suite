import type { McpTool } from "../store/store"

// A small MCP client over Streamable HTTP. Each call is its own short session: Workers keep no long-lived connections.
const PROTOCOL = "2025-06-18"
const MAX_BODY = 1_000_000
const MAX_RESULT_CHARS = 8000

export class McpError extends Error {}

/** Blocks addresses that would let a saved connection reach this server's own network. */
export const checkMcpUrl = (raw: string, allowPrivate: boolean) => {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new McpError("That is not a valid URL")
  }
  if (allowPrivate) {
    if (!/^https?:$/.test(url.protocol))
      throw new McpError("Use an http or https URL")
    return url
  }
  if (url.protocol !== "https:")
    throw new McpError("MCP servers must use https")
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "")
  // Only public IPv6 (2000::/3) is allowed; mapped, unspecified and local forms are refused outright.
  if (host.includes(":") && !/^[23][0-9a-f]{0,3}:/.test(host))
    throw new McpError("Private and local addresses are not allowed")
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".internal") ||
    host.endsWith(".local") ||
    /^(127|10|0)\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host === "::1" ||
    /^f[cd]/.test(host) ||
    /^fe80:/.test(host)
  )
    throw new McpError("Private and local addresses are not allowed")
  return url
}

const parseBody = (text: string, type: string, id: number) => {
  if (text.length > MAX_BODY)
    throw new McpError("The server sent too much data")
  const candidates: string[] = []
  if (type.includes("text/event-stream")) {
    for (const event of text.split(/\r?\n\r?\n/)) {
      const data = event
        .split(/\r?\n/)
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trim())
        .join("\n")
      if (data) candidates.push(data)
    }
  } else candidates.push(text)
  for (const c of candidates) {
    try {
      const m = JSON.parse(c) as {
        id?: number
        result?: unknown
        error?: { message?: string }
      }
      if (m.id !== id) continue
      if (m.error)
        throw new McpError(m.error.message ?? "The server reported an error")
      return m.result
    } catch (e) {
      if (e instanceof McpError) throw e
    }
  }
  throw new McpError("The server did not answer this request")
}

export type McpTarget = {
  url: string
  headers: Record<string, string>
  timeoutMs: number
  allowPrivate: boolean
}

const session = async (t: McpTarget) => {
  const url = checkMcpUrl(t.url, t.allowPrivate)
  let sessionId = ""
  let nextId = 1
  const post = async (body: unknown) =>
    fetch(url, {
      method: "POST",
      // A redirect could point at an address the check above would have refused. Workers only allow "manual".
      redirect: "manual",
      signal: AbortSignal.timeout(t.timeoutMs),
      headers: {
        ...t.headers,
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": PROTOCOL,
        ...(sessionId ? { "mcp-session-id": sessionId } : {}),
      },
      body: JSON.stringify(body),
    })
  const request = async (method: string, params: unknown) => {
    const id = nextId++
    const res = await post({ jsonrpc: "2.0", id, method, params })
    if (
      res.type === "opaqueredirect" ||
      (res.status >= 300 && res.status < 400)
    )
      throw new McpError("The server tried to redirect, which is not allowed")
    if (!res.ok) {
      throw new McpError(
        res.status === 401 || res.status === 403
          ? `The server refused the credentials (HTTP ${res.status})`
          : `The server answered HTTP ${res.status}`,
      )
    }
    sessionId = res.headers.get("mcp-session-id") ?? sessionId
    return parseBody(
      await res.text(),
      res.headers.get("content-type") ?? "",
      id,
    )
  }
  await request("initialize", {
    protocolVersion: PROTOCOL,
    capabilities: {},
    clientInfo: { name: "base-suite-assistant", version: "0.1.0" },
  })
  await post({ jsonrpc: "2.0", method: "notifications/initialized" }).catch(
    () => null,
  )
  return { request }
}

type WireTool = {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
  annotations?: { readOnlyHint?: boolean }
}

/** Lists a server's tools. Tools it does not mark read-only start switched off. */
export const listMcpTools = async (
  t: McpTarget,
  previous: McpTool[] = [],
): Promise<McpTool[]> => {
  const s = await session(t)
  const tools: WireTool[] = []
  let cursor: string | undefined
  for (let page = 0; page < 10; page++) {
    const r = (await s.request("tools/list", cursor ? { cursor } : {})) as {
      tools?: WireTool[]
      nextCursor?: string
    }
    tools.push(...(r.tools ?? []))
    cursor = r.nextCursor
    if (!cursor) break
  }
  const before = new Map(previous.map((p) => [p.name, p]))
  return tools.slice(0, 200).map((w) => {
    const readOnly = w.annotations?.readOnlyHint === true
    return {
      name: w.name,
      description: (w.description ?? "").slice(0, 1000),
      inputSchema: w.inputSchema ?? { type: "object", properties: {} },
      readOnly,
      enabled: before.get(w.name)?.enabled ?? readOnly,
    }
  })
}

export const callMcpTool = async (
  t: McpTarget,
  name: string,
  args: Record<string, unknown>,
) => {
  const s = await session(t)
  const r = (await s.request("tools/call", { name, arguments: args })) as {
    isError?: boolean
    content?: { type: string; text?: string }[]
    structuredContent?: unknown
  }
  const text = (r.content ?? [])
    .flatMap((c) => (c.type === "text" && c.text ? [c.text] : []))
    .join("\n")
  const out =
    text ||
    (r.structuredContent
      ? JSON.stringify(r.structuredContent)
      : "(no text returned)")
  return { text: out.slice(0, MAX_RESULT_CHARS), isError: !!r.isError }
}

/** Connection headers from the admin's form: one "Name: value" per line. */
export const parseHeaderLines = (s: string) => {
  const out: Record<string, string> = {}
  for (const line of s.split(/\r?\n/)) {
    const i = line.indexOf(":")
    if (i <= 0) continue
    const k = line.slice(0, i).trim().toLowerCase()
    if (/^[a-z0-9-]+$/.test(k)) out[k] = line.slice(i + 1).trim()
  }
  return out
}
