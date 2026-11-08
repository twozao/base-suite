import { afterEach, describe, expect, it, vi } from "vitest"
import {
  callMcpTool,
  checkMcpUrl,
  listMcpTools,
  parseHeaderLines,
} from "../src/mcp/client"
import { jsonResponse } from "./support"

const target = {
  url: "https://mcp.example/mcp",
  headers: { authorization: "Bearer t" },
  timeoutMs: 1000,
  allowPrivate: false,
}
afterEach(() => vi.unstubAllGlobals())

const server = (
  handle: (m: { id?: number; method: string; params?: unknown }) => unknown,
  sse = false,
) => {
  const seen: { method: string; headers: Headers; redirect?: string }[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: unknown, init: RequestInit) => {
      const m = JSON.parse(String(init.body))
      seen.push({
        method: m.method,
        headers: new Headers(init.headers),
        redirect: init.redirect,
      })
      if (m.id === undefined) return new Response(null, { status: 202 })
      const result =
        m.method === "initialize"
          ? { protocolVersion: "2025-06-18", capabilities: {} }
          : handle(m)
      const body = { jsonrpc: "2.0", id: m.id, result }
      return sse
        ? new Response(`event: message\ndata: ${JSON.stringify(body)}\n\n`, {
            headers: {
              "content-type": "text/event-stream",
              "mcp-session-id": "s1",
            },
          })
        : jsonResponse(body, 200, { "mcp-session-id": "s1" })
    }),
  )
  return seen
}

describe("URL check", () => {
  it("refuses local and private addresses and plain http", () => {
    for (const u of [
      "http://example.com/mcp",
      "https://localhost/mcp",
      "https://127.0.0.1/x",
      "https://10.0.0.1/x",
      "https://192.168.1.1/x",
      "https://172.16.0.1/x",
      "https://169.254.169.254/latest",
      "https://[::1]/x",
      "https://svc.internal/x",
      "not a url",
    ])
      expect(() => checkMcpUrl(u, false), u).toThrow()
  })
  it("allows public https, and local addresses only when told to", () => {
    expect(checkMcpUrl("https://mcp.example.com/x", false).hostname).toBe(
      "mcp.example.com",
    )
    expect(checkMcpUrl("http://localhost:3000/mcp", true).port).toBe("3000")
  })
})

describe("tools", () => {
  const tools = {
    tools: [
      {
        name: "read_it",
        description: "r",
        inputSchema: { type: "object" },
        annotations: { readOnlyHint: true },
      },
      { name: "delete_it", description: "w", inputSchema: { type: "object" } },
    ],
  }
  it("starts only read-only tools on, and keeps the admin's later choice", async () => {
    server(() => tools)
    const first = await listMcpTools(target)
    expect(first.map((t) => [t.name, t.enabled])).toEqual([
      ["read_it", true],
      ["delete_it", false],
    ])
    const second = await listMcpTools(target, [
      { ...first[1], enabled: true },
      { ...first[0], enabled: false },
    ])
    expect(second.map((t) => t.enabled)).toEqual([false, true])
  })
  it("speaks the protocol: initializes, sends the session id and refuses redirects", async () => {
    const seen = server(() => tools)
    await listMcpTools(target)
    expect(seen.map((s) => s.method)).toEqual([
      "initialize",
      "notifications/initialized",
      "tools/list",
    ])
    expect(seen[2].headers.get("mcp-session-id")).toBe("s1")
    expect(seen[2].headers.get("authorization")).toBe("Bearer t")
    expect(seen.every((s) => s.redirect === "manual")).toBe(true)
  })
  it("reads answers sent as an event stream", async () => {
    server(() => ({ content: [{ type: "text", text: "from stream" }] }), true)
    expect((await callMcpTool(target, "read_it", {})).text).toBe("from stream")
  })
  it("reports a tool error and caps the result", async () => {
    server(() => ({
      isError: true,
      content: [{ type: "text", text: "x".repeat(20000) }],
    }))
    const r = await callMcpTool(target, "read_it", {})
    expect(r.isError).toBe(true)
    expect(r.text.length).toBe(8000)
  })
  it("explains refused credentials", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("no", { status: 401 })),
    )
    await expect(listMcpTools(target)).rejects.toThrow(/credentials/)
  })
  it("refuses to follow a redirect", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(null, {
            status: 302,
            headers: { location: "https://169.254.169.254/" },
          }),
      ),
    )
    await expect(listMcpTools(target)).rejects.toThrow(/redirect/)
  })
  it("will not even call a private address", async () => {
    const f = vi.fn()
    vi.stubGlobal("fetch", f)
    await expect(
      listMcpTools({ ...target, url: "https://169.254.169.254/x" }),
    ).rejects.toThrow()
    expect(f).not.toHaveBeenCalled()
  })
})

describe("headers", () => {
  it("reads one per line and skips junk", () => {
    expect(
      parseHeaderLines("Authorization: Bearer a:b\nnonsense\nX-Key: 1"),
    ).toEqual({ authorization: "Bearer a:b", "x-key": "1" })
  })
})
