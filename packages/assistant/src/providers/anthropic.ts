import Anthropic from "@anthropic-ai/sdk"
import type { ChatMessage, ChatRequest, ChatResult, Provider } from "./types"

// Claude through the official SDK. maxRetries is 0 because the chain decides when to try the next provider.
export const DEFAULT_CLAUDE_MODEL = "claude-opus-5-5"
const CURRENT = /^claude-(opus|sonnet|haiku|fable)-5/
const FALLBACK = /^claude-(fable-5-1|opus-5-5|opus-5$|sonnet-5-5)/

type Block = Record<string, unknown>

const toWire = (messages: ChatMessage[], self: string) => {
  const out: { role: "user" | "assistant"; content: string | Block[] }[] = []
  for (const m of messages) {
    if (m.role === "user") out.push({ role: "user", content: m.content })
    else if (m.role === "assistant") {
      // Replay Claude's own content unchanged: thinking blocks are only valid exactly as they were returned.
      if (m.raw?.provider === self)
        out.push({ role: "assistant", content: m.raw.value as Block[] })
      else if (m.toolCalls?.length) {
        out.push({
          role: "assistant",
          content: [
            ...(m.content ? [{ type: "text", text: m.content }] : []),
            ...m.toolCalls.map((c) => ({
              type: "tool_use",
              id: c.id,
              name: c.name,
              input: c.args,
            })),
          ],
        })
      } else out.push({ role: "assistant", content: m.content })
    } else {
      const block = {
        type: "tool_result",
        tool_use_id: m.toolCallId,
        content: m.content,
        ...(m.isError ? { is_error: true } : {}),
      }
      const last = out[out.length - 1]
      // All results of one turn travel in a single user message.
      if (last?.role === "user" && Array.isArray(last.content))
        last.content.push(block)
      else out.push({ role: "user", content: [block] })
    }
  }
  return out
}

export const anthropicProvider = (o: {
  id: string
  model: string
  apiKey: string
}): Provider => {
  const client = new Anthropic({ apiKey: o.apiKey, maxRetries: 0 })
  const self = `anthropic:${o.id}`
  return {
    id: o.id,
    type: "anthropic",
    model: o.model,
    async chat(req: ChatRequest): Promise<ChatResult> {
      const params = {
        model: o.model,
        max_tokens: req.maxTokens,
        system: req.system,
        messages: toWire(req.messages, self),
        ...(req.tools.length
          ? {
              tools: req.tools.map((t) => ({
                name: t.name,
                description: t.description,
                input_schema: t.inputSchema,
              })),
            }
          : {}),
        // Chat replies do well at low effort, and it keeps both cost and latency down.
        ...(CURRENT.test(o.model) ? { output_config: { effort: "low" } } : {}),
        // Lets Anthropic route a safety refusal to a fallback model instead of stopping the conversation.
        ...(FALLBACK.test(o.model)
          ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" }
          : {}),
      }
      const res = (await client.beta.messages.create(params as never, {
        timeout: req.timeoutMs,
      })) as unknown as {
        stop_reason: string
        content: Block[]
        usage: { input_tokens: number; output_tokens: number }
      }
      const usage = {
        inputTokens: res.usage.input_tokens,
        outputTokens: res.usage.output_tokens,
      }
      if (res.stop_reason === "refusal")
        return { text: "", toolCalls: [], refused: true, ...usage }
      return {
        text: res.content
          .flatMap((b) => (b.type === "text" ? [String(b.text)] : []))
          .join(""),
        toolCalls: res.content.flatMap((b) =>
          b.type === "tool_use"
            ? [
                {
                  id: String(b.id),
                  name: String(b.name),
                  args: (b.input ?? {}) as Record<string, unknown>,
                },
              ]
            : [],
        ),
        raw: { provider: self, value: res.content },
        ...usage,
      }
    },
  }
}
