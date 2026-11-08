import {
  readError,
  type ChatMessage,
  type ChatRequest,
  type ChatResult,
  type Provider,
} from "./types"

const toWire = (messages: ChatMessage[]) => {
  const out: { role: string; parts: Record<string, unknown>[] }[] = []
  for (const m of messages) {
    if (m.role === "user")
      out.push({ role: "user", parts: [{ text: m.content }] })
    else if (m.role === "assistant") {
      if (m.raw?.provider === "gemini")
        out.push(m.raw.value as (typeof out)[number])
      else {
        out.push({
          role: "model",
          parts: [
            ...(m.content ? [{ text: m.content }] : []),
            ...(m.toolCalls ?? []).map((c) => ({
              functionCall: { name: c.name, args: c.args },
            })),
          ],
        })
      }
    } else {
      const part = {
        functionResponse: { name: m.name, response: { result: m.content } },
      }
      const last = out[out.length - 1]
      if (last?.role === "user" && last.parts[0]?.functionResponse)
        last.parts.push(part)
      else out.push({ role: "user", parts: [part] })
    }
  }
  return out
}

export const geminiProvider = (o: {
  id: string
  model: string
  apiKey: string
}): Provider => ({
  id: o.id,
  type: "gemini",
  model: o.model,
  async chat(req: ChatRequest): Promise<ChatResult> {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(o.model)}:generateContent`,
      {
        method: "POST",
        signal: AbortSignal.timeout(req.timeoutMs),
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": o.apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: req.system }] },
          contents: toWire(req.messages),
          generationConfig: { maxOutputTokens: req.maxTokens },
          ...(req.tools.length
            ? {
                tools: [
                  {
                    functionDeclarations: req.tools.map((t) => ({
                      name: t.name,
                      description: t.description,
                      parameters: t.inputSchema,
                    })),
                  },
                ],
              }
            : {}),
        }),
      },
    )
    if (!res.ok) throw await readError(res)
    const d = (await res.json()) as {
      candidates?: {
        content?: { role: string; parts?: Record<string, unknown>[] }
      }[]
      usageMetadata?: {
        promptTokenCount?: number
        candidatesTokenCount?: number
      }
    }
    const content = d.candidates?.[0]?.content
    const parts = content?.parts ?? []
    return {
      text: parts
        .flatMap((p) => (typeof p.text === "string" ? [p.text] : []))
        .join(""),
      toolCalls: parts.flatMap((p, i) => {
        const f = p.functionCall as
          | { name: string; args?: Record<string, unknown> }
          | undefined
        return f ? [{ id: `call_${i}`, name: f.name, args: f.args ?? {} }] : []
      }),
      inputTokens: d.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: d.usageMetadata?.candidatesTokenCount ?? 0,
      raw: content ? { provider: "gemini", value: content } : undefined,
    }
  },
})
