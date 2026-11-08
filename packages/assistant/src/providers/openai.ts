import {
  readError,
  type ChatMessage,
  type ChatRequest,
  type ChatResult,
  type Provider,
} from "./types"

const toWire = (system: string, messages: ChatMessage[]) => [
  { role: "system", content: system },
  ...messages.map((m) => {
    if (m.role === "tool")
      return { role: "tool", tool_call_id: m.toolCallId, content: m.content }
    if (m.role === "assistant" && m.toolCalls?.length) {
      return {
        role: "assistant",
        content: m.content || null,
        tool_calls: m.toolCalls.map((c) => ({
          id: c.id,
          type: "function",
          function: { name: c.name, arguments: JSON.stringify(c.args) },
        })),
      }
    }
    return { role: m.role, content: m.content }
  }),
]

const parseArgs = (s: unknown) => {
  try {
    const v = JSON.parse(String(s ?? "{}"))
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

/** Anything speaking the OpenAI chat completions format: OpenAI, Groq, OpenRouter, Cerebras, Mistral, Ollama and more. */
export const openAiCompatible = (o: {
  id: string
  type: string
  model: string
  baseUrl: string
  apiKey: string
}): Provider => ({
  id: o.id,
  type: o.type,
  model: o.model,
  async chat(req: ChatRequest): Promise<ChatResult> {
    const res = await fetch(
      `${o.baseUrl.replace(/\/+$/, "")}/chat/completions`,
      {
        method: "POST",
        signal: AbortSignal.timeout(req.timeoutMs),
        headers: {
          "content-type": "application/json",
          ...(o.apiKey ? { authorization: `Bearer ${o.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: o.model,
          messages: toWire(req.system, req.messages),
          max_tokens: req.maxTokens,
          ...(req.tools.length
            ? {
                tools: req.tools.map((t) => ({
                  type: "function",
                  function: {
                    name: t.name,
                    description: t.description,
                    parameters: t.inputSchema,
                  },
                })),
              }
            : {}),
        }),
      },
    )
    if (!res.ok) throw await readError(res)
    const d = (await res.json()) as {
      choices?: {
        message?: {
          content?: string | null
          tool_calls?: {
            id: string
            function: { name: string; arguments: string }
          }[]
        }
      }[]
      usage?: { prompt_tokens?: number; completion_tokens?: number }
    }
    const m = d.choices?.[0]?.message
    return {
      text: m?.content ?? "",
      toolCalls: (m?.tool_calls ?? []).map((c) => ({
        id: c.id,
        name: c.function.name,
        args: parseArgs(c.function.arguments),
      })),
      inputTokens: d.usage?.prompt_tokens ?? 0,
      outputTokens: d.usage?.completion_tokens ?? 0,
    }
  },
})
