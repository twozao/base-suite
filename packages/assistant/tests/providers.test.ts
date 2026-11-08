import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { anthropicProvider } from "../src/providers/anthropic"
import { cloudflareProvider, parseToolReply } from "../src/providers/cloudflare"
import { geminiProvider } from "../src/providers/gemini"
import { openAiCompatible } from "../src/providers/openai"
import { resetFailures, runChain } from "../src/providers/registry"
import {
  ProviderError,
  type ChatRequest,
  type Provider,
} from "../src/providers/types"
import { jsonResponse } from "./support"

const req: ChatRequest = {
  system: "sys",
  messages: [{ role: "user", content: "hi" }],
  tools: [
    {
      name: "lookup",
      description: "d",
      inputSchema: { type: "object", properties: {} },
    },
  ],
  maxTokens: 100,
  timeoutMs: 1000,
}
let sent: { url: string; body: Record<string, unknown>; headers: Headers }[]
const stub = (answer: () => Response) => {
  sent = []
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const u = url instanceof Request ? url.url : String(url)
      sent.push({
        url: u,
        body: JSON.parse(String(init?.body ?? "{}")),
        headers: new Headers(init?.headers),
      })
      return answer()
    }),
  )
}
afterEach(() => vi.unstubAllGlobals())

describe("OpenAI-compatible", () => {
  it("sends tools and reads tool calls", async () => {
    stub(() =>
      jsonResponse({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: "c1",
                  function: { name: "lookup", arguments: '{"q":"x"}' },
                },
              ],
            },
          },
        ],
        usage: { prompt_tokens: 5, completion_tokens: 2 },
      }),
    )
    const p = openAiCompatible({
      id: "g",
      type: "groq",
      model: "m",
      baseUrl: "https://api.example/v1/",
      apiKey: "k",
    })
    const r = await p.chat(req)
    expect(sent[0].url).toBe("https://api.example/v1/chat/completions")
    expect(sent[0].headers.get("authorization")).toBe("Bearer k")
    expect(r.toolCalls).toEqual([
      { id: "c1", name: "lookup", args: { q: "x" } },
    ])
    expect(r.inputTokens).toBe(5)
  })
  it("reports the status and hides anything key-shaped", async () => {
    stub(() => new Response("bad key sk-abcdefghijklmnop", { status: 401 }))
    const p = openAiCompatible({
      id: "g",
      type: "groq",
      model: "m",
      baseUrl: "https://a/v1",
      apiKey: "k",
    })
    const e = await p.chat(req).catch((x) => x)
    expect(e).toBeInstanceOf(ProviderError)
    expect(e.status).toBe(401)
    expect(e.message).not.toContain("sk-abc")
  })
})

describe("Anthropic", () => {
  const claude = () =>
    stub(() =>
      jsonResponse({
        id: "m",
        type: "message",
        role: "assistant",
        model: "claude-opus-5-5",
        stop_reason: "tool_use",
        content: [
          { type: "thinking", thinking: "", signature: "s" },
          { type: "tool_use", id: "t1", name: "lookup", input: { q: "x" } },
        ],
        usage: { input_tokens: 3, output_tokens: 1 },
      }),
    )
  it("calls the current model with the refusal fallback and no sampling settings", async () => {
    claude()
    const r = await anthropicProvider({
      id: "a",
      model: "claude-opus-5-5",
      apiKey: "k",
    }).chat(req)
    const b = sent[0].body
    expect(b.model).toBe("claude-opus-5-5")
    expect(b.fallbacks).toBe("default")
    expect(sent[0].headers.get("anthropic-beta")).toContain(
      "server-side-fallback-2026-07-01",
    )
    expect(b).not.toHaveProperty("temperature")
    expect(b).not.toHaveProperty("thinking")
    expect(
      (b.tools as { input_schema: unknown }[])[0].input_schema,
    ).toBeTruthy()
    expect(r.toolCalls[0].name).toBe("lookup")
  })
  it("replays its own content unchanged, and groups tool results into one message", async () => {
    claude()
    const p = anthropicProvider({
      id: "a",
      model: "claude-opus-5-5",
      apiKey: "k",
    })
    const first = await p.chat(req)
    await p.chat({
      ...req,
      messages: [
        { role: "user", content: "hi" },
        {
          role: "assistant",
          content: "",
          toolCalls: first.toolCalls,
          raw: first.raw,
        },
        { role: "tool", toolCallId: "t1", name: "lookup", content: "one" },
        { role: "tool", toolCallId: "t2", name: "lookup", content: "two" },
      ],
    })
    const msgs = sent[1].body.messages as {
      role: string
      content: { type: string }[]
    }[]
    expect(msgs[1].content[0].type).toBe("thinking")
    expect(msgs).toHaveLength(3)
    expect(msgs[2].content.map((c) => c.type)).toEqual([
      "tool_result",
      "tool_result",
    ])
  })
  it("treats a refusal as an answer, not an outage", async () => {
    stub(() =>
      jsonResponse({
        id: "m",
        type: "message",
        role: "assistant",
        model: "x",
        stop_reason: "refusal",
        stop_details: { type: "refusal", category: null },
        content: [],
        usage: { input_tokens: 1, output_tokens: 0 },
      }),
    )
    const r = await anthropicProvider({
      id: "a",
      model: "claude-opus-5-5",
      apiKey: "k",
    }).chat(req)
    expect(r.refused).toBe(true)
  })
  it("does not send newer options to an older model", async () => {
    claude()
    await anthropicProvider({
      id: "a",
      model: "claude-haiku-4-5",
      apiKey: "k",
    }).chat(req)
    expect(sent[0].body).not.toHaveProperty("output_config")
    expect(sent[0].body).not.toHaveProperty("fallbacks")
  })
})

describe("Gemini", () => {
  it("sends the key in a header, never the URL", async () => {
    stub(() =>
      jsonResponse({
        candidates: [
          {
            content: {
              role: "model",
              parts: [{ functionCall: { name: "lookup", args: { a: 1 } } }],
            },
          },
        ],
      }),
    )
    const r = await geminiProvider({
      id: "g",
      model: "gemini-x",
      apiKey: "secret",
    }).chat(req)
    expect(sent[0].url).not.toContain("secret")
    expect(sent[0].headers.get("x-goog-api-key")).toBe("secret")
    expect(r.toolCalls[0].args).toEqual({ a: 1 })
  })
})

describe("Cloudflare Workers AI", () => {
  it("uses the binding, offers tools in the prompt and reads the JSON reply", async () => {
    const run = vi.fn(async () => ({
      response:
        '```json\n{"tool_calls":[{"name":"lookup","arguments":{"q":"x"}}]}\n```',
    }))
    const r = await cloudflareProvider({
      id: "c",
      model: "@cf/x",
      binding: { run },
    }).chat(req)
    const input = (run.mock.calls[0] as unknown[])[1] as {
      messages: { content: string }[]
    }
    expect(input.messages[0].content).toContain("lookup")
    expect(r.toolCalls[0]).toMatchObject({ name: "lookup", args: { q: "x" } })
    expect(r.text).toBe("")
  })
  it("uses the REST API with an account and token when there is no binding", async () => {
    stub(() => jsonResponse({ result: { response: "hello" } }))
    const r = await cloudflareProvider({
      id: "c",
      model: "@cf/x",
      accountId: "acc",
      apiKey: "k",
    }).chat({ ...req, tools: [] })
    expect(sent[0].url).toContain("/accounts/acc/ai/run/@cf/x")
    expect(r.text).toBe("hello")
  })
  it("ignores a tool the model made up, and ordinary text", () => {
    expect(
      parseToolReply(
        '{"tool_calls":[{"name":"delete_everything"}]}',
        new Set(["lookup"]),
      ),
    ).toEqual([])
    expect(parseToolReply("We open at nine.", new Set(["lookup"]))).toEqual([])
  })
})

describe("failover", () => {
  const ok = (id: string): Provider => ({
    id,
    type: "t",
    model: "m",
    chat: async () => ({
      text: id,
      toolCalls: [],
      inputTokens: 1,
      outputTokens: 1,
    }),
  })
  const bad = (id: string, status = 503): Provider & { calls: number } => {
    const p = {
      id,
      type: "t",
      model: "m",
      calls: 0,
      chat: async () => {
        p.calls++
        throw new ProviderError(status, "down")
      },
    }
    return p
  }
  const noop = async () => {}
  beforeEach(() => resetFailures())

  it("falls through to the next provider", async () => {
    expect((await runChain([bad("a"), ok("b")], req, noop)).provider.id).toBe(
      "b",
    )
  })
  it("rests a provider after three failures in a row", async () => {
    const a = bad("a")
    for (let i = 0; i < 5; i++) await runChain([a, ok("b")], req, noop)
    expect(a.calls).toBe(3)
  })
  it("says what happened when all fail", async () => {
    await expect(
      runChain([bad("a", 429), bad("b", 500)], req, noop),
    ).rejects.toThrow(/a: 429.*b: 500/)
  })
  it("stays on the provider already in the conversation", async () => {
    expect(
      (await runChain([ok("a"), ok("b")], req, noop, "b")).provider.id,
    ).toBe("b")
  })
})
