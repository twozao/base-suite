// One shape for every model provider. Adapters turn it into their own wire format and back.
export type ToolDef = {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}
export type ToolCall = {
  id: string
  name: string
  args: Record<string, unknown>
}
export type ChatMessage =
  | { role: "user"; content: string }
  | {
      role: "assistant"
      content: string
      toolCalls?: ToolCall[]
      /** The provider's own message, replayed unchanged to that provider (Claude requires this for thinking blocks). */
      raw?: { provider: string; value: unknown }
    }
  | {
      role: "tool"
      toolCallId: string
      name: string
      content: string
      isError?: boolean
    }

export type ChatRequest = {
  system: string
  messages: ChatMessage[]
  tools: ToolDef[]
  maxTokens: number
  timeoutMs: number
}
export type ChatResult = {
  text: string
  toolCalls: ToolCall[]
  inputTokens: number
  outputTokens: number
  raw?: { provider: string; value: unknown }
  /** The model declined. Not a failure of the provider, so the chain does not retry elsewhere. */
  refused?: boolean
}
export interface Provider {
  id: string
  type: string
  model: string
  chat(req: ChatRequest): Promise<ChatResult>
}

export class ProviderError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

export const readError = async (res: Response) => {
  // Status plus a short excerpt. Provider bodies can be long and must never carry a key back into logs.
  const body = (await res.text().catch(() => ""))
    .slice(0, 200)
    .replace(/(sk|key|token)[-_a-z0-9]{8,}/gi, "[redacted]")
  return new ProviderError(res.status, `HTTP ${res.status}: ${body}`)
}
