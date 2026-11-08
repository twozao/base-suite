import type { ProviderConfig, ProviderType } from "../settings"
import type { AssistantStore } from "../store/store"
import { anthropicProvider, DEFAULT_CLAUDE_MODEL } from "./anthropic"
import { cloudflareProvider, type WorkersAiBinding } from "./cloudflare"
import { geminiProvider } from "./gemini"
import { openAiCompatible } from "./openai"
import {
  ProviderError,
  type ChatRequest,
  type ChatResult,
  type Provider,
} from "./types"

export const PROVIDER_INFO: Record<
  ProviderType,
  {
    label: string
    model: string
    baseUrl?: string
    needsKey: boolean
    keysUrl?: string
  }
> = {
  cloudflare: {
    label: "Cloudflare Workers AI",
    model: "@cf/meta/llama-3.1-8b-instruct",
    needsKey: false,
    keysUrl: "https://dash.cloudflare.com/profile/api-tokens",
  },
  anthropic: {
    label: "Anthropic (Claude)",
    model: DEFAULT_CLAUDE_MODEL,
    needsKey: true,
    keysUrl: "https://console.anthropic.com/settings/keys",
  },
  openai: {
    label: "OpenAI",
    model: "",
    baseUrl: "https://api.openai.com/v1",
    needsKey: true,
    keysUrl: "https://platform.openai.com/api-keys",
  },
  gemini: {
    label: "Google Gemini",
    model: "gemini-2.5-flash-lite",
    needsKey: true,
    keysUrl: "https://aistudio.google.com/apikey",
  },
  groq: {
    label: "Groq",
    model: "openai/gpt-oss-20b",
    baseUrl: "https://api.groq.com/openai/v1",
    needsKey: true,
    keysUrl: "https://console.groq.com/keys",
  },
  openrouter: {
    label: "OpenRouter",
    model: "",
    baseUrl: "https://openrouter.ai/api/v1",
    needsKey: true,
    keysUrl: "https://openrouter.ai/keys",
  },
  cerebras: {
    label: "Cerebras",
    model: "gpt-oss-120b",
    baseUrl: "https://api.cerebras.ai/v1",
    needsKey: true,
    keysUrl: "https://cloud.cerebras.ai",
  },
  mistral: {
    label: "Mistral",
    model: "mistral-small-latest",
    baseUrl: "https://api.mistral.ai/v1",
    needsKey: true,
    keysUrl: "https://console.mistral.ai/api-keys",
  },
  custom: { label: "Custom (OpenAI-compatible)", model: "", needsKey: false },
  mock: { label: "Scripted test provider", model: "scripted", needsKey: false },
}

/** A scripted model for local runs and tests: no key and no network. It echoes the first passage it was given. */
export const mockProvider = (id: string): Provider => ({
  id,
  type: "mock",
  model: "scripted",
  async chat(req) {
    const last = req.messages[req.messages.length - 1]
    if (
      req.tools.length &&
      last.role === "user" &&
      /\b(use|call) (the )?tool\b/i.test(last.content)
    ) {
      return {
        text: "",
        toolCalls: [{ id: "call_1", name: req.tools[0].name, args: {} }],
        inputTokens: 10,
        outputTokens: 5,
      }
    }
    if (last.role === "tool")
      return {
        text: `Tool says: ${last.content}`,
        toolCalls: [],
        inputTokens: 10,
        outputTokens: 5,
      }
    const passage = /<passage n=[^>]*>\s*([\s\S]*?)<\/passage>/
      .exec(req.system)?.[1]
      ?.trim()
    return {
      text: passage
        ? `From our content: ${passage}`
        : "No passage was provided.",
      toolCalls: [],
      inputTokens: 10,
      outputTokens: 5,
    }
  },
})

export const keyName = (id: string) => `provider:${id}`

export const buildProvider = async (
  cfg: ProviderConfig,
  store: AssistantStore,
  env: { ai?: WorkersAiBinding | null },
): Promise<Provider | null> => {
  const info = PROVIDER_INFO[cfg.type]
  const apiKey = (await store.getSecret(keyName(cfg.id))) ?? ""
  switch (cfg.type) {
    case "mock":
      return mockProvider(cfg.id)
    case "cloudflare":
      if (!env.ai && !(cfg.accountId && apiKey)) return null
      return cloudflareProvider({
        id: cfg.id,
        model: cfg.model,
        binding: env.ai,
        accountId: cfg.accountId,
        apiKey,
      })
    case "anthropic":
      return apiKey
        ? anthropicProvider({ id: cfg.id, model: cfg.model, apiKey })
        : null
    case "gemini":
      return apiKey
        ? geminiProvider({ id: cfg.id, model: cfg.model, apiKey })
        : null
    case "custom":
      return cfg.baseUrl
        ? openAiCompatible({
            id: cfg.id,
            type: cfg.type,
            model: cfg.model,
            baseUrl: cfg.baseUrl,
            apiKey,
          })
        : null
    default:
      return apiKey
        ? openAiCompatible({
            id: cfg.id,
            type: cfg.type,
            model: cfg.model,
            baseUrl: info.baseUrl ?? "",
            apiKey,
          })
        : null
  }
}

const PARK_AFTER = 3
const PARK_MS = 5 * 60_000
// In memory per process: a provider failing three times in a row is skipped for five minutes.
const failures = new Map<string, { fails: number; until: number }>()

export const resetFailures = () => failures.clear()

/** Tries providers in the admin's order. A quota, outage, timeout or bad key falls through to the next one. */
export const runChain = async (
  providers: Provider[],
  req: ChatRequest,
  onResult: (
    p: Provider,
    r: { ok: boolean; result?: ChatResult; error?: string },
  ) => Promise<void>,
  /** Keeps a tool conversation on one provider where possible. */
  prefer?: string,
) => {
  const order = prefer
    ? [...providers].sort(
        (a, b) => Number(b.id === prefer) - Number(a.id === prefer),
      )
    : providers
  const errors: string[] = []
  for (const p of order) {
    const f = failures.get(p.id)
    if (f && f.until > Date.now()) {
      errors.push(`${p.id}: resting after repeated failures`)
      continue
    }
    try {
      const result = await p.chat(req)
      failures.delete(p.id)
      await onResult(p, { ok: true, result })
      return { provider: p, result }
    } catch (e) {
      const message = e instanceof Error ? e.message.slice(0, 300) : String(e)
      const fails = (f?.fails ?? 0) + 1
      failures.set(p.id, {
        fails,
        until: fails >= PARK_AFTER ? Date.now() + PARK_MS : 0,
      })
      errors.push(
        `${p.id}: ${e instanceof ProviderError ? e.status : ""} ${message}`.trim(),
      )
      await onResult(p, { ok: false, error: message })
    }
  }
  throw new Error(errors.join("; ") || "No AI provider is configured")
}
