import { z } from "zod"
import { DEFAULT_SMALL_TALK } from "./agent/small-talk"

// Everything an admin edits, validated on every read so a bad row can never break the chat.
export const ROLES = ["public", "user", "admin"] as const
export type Role = (typeof ROLES)[number]

const FIELD_MODES = ["off", "optional", "required"] as const

export const PROVIDER_TYPES = [
  "cloudflare",
  "anthropic",
  "openai",
  "gemini",
  "groq",
  "openrouter",
  "cerebras",
  "mistral",
  "custom",
  "mock",
] as const
export type ProviderType = (typeof PROVIDER_TYPES)[number]

export const providerConfigSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,40}$/),
  type: z.enum(PROVIDER_TYPES),
  model: z.string().trim().min(1, "Choose a model").max(200),
  enabled: z.boolean(),
  /** Cloudflare only, when not using the Workers AI binding. */
  accountId: z.string().trim().max(100).default(""),
  /** Custom only: any OpenAI-compatible endpoint. */
  baseUrl: z.string().trim().max(300).default(""),
})
export type ProviderConfig = z.output<typeof providerConfigSchema>

export const settingsSchema = z.object({
  enabled: z.boolean().default(false),
  allowPublic: z.boolean().default(false),
  allowUsers: z.boolean().default(true),
  assistantName: z.string().trim().min(1).max(60).default("Assistant"),
  greeting: z
    .string()
    .trim()
    .max(1000)
    .default("Hi! Ask me anything about this site."),
  /** One per line, as is greeting; one is picked each time. {name} is the visitor's first name. */
  welcomeNamed: z
    .string()
    .trim()
    .max(1000)
    .default(
      "Hi {name}! How can I help you today?\nHello {name}! What can I help you with?\nHi {name}, good to meet you. What would you like to know?",
    ),
  welcomeBack: z
    .string()
    .trim()
    .max(1000)
    .default(
      "Welcome back, {name}! What can I help you with today?\nGood to see you again, {name}. Anything I can help with?",
    ),
  /** Said in place of honestyReply when that has just been said, so it does not read like a stuck record. */
  honestyFollowups: z
    .string()
    .trim()
    .max(1500)
    .default(
      "I couldn't find that one either. You could try asking about {topics}, or contact us and a person will help.\nStill nothing on that, sorry. I know most about {topics}. For anything else, a person can help if you contact us.",
    ),
  /** What {topics} says. Empty builds it from your content. */
  topics: z.string().trim().max(300).default(""),
  /** Keeps the host's own pages in the knowledge base without anyone pressing Import. */
  siteSync: z.boolean().default(true),
  smallTalk: z
    .object({
      enabled: z.boolean().default(true),
      /** Lets the model word the reply to fit the conversation. Your lines are used when there is no model. */
      useModel: z.boolean().default(true),
      kinds: z
        .array(
          z.object({
            id: z.string().trim().min(1).max(40),
            label: z.string().trim().min(1).max(60),
            enabled: z.boolean(),
            patterns: z.string().max(3000),
            replies: z.string().max(3000),
            repeats: z.string().max(3000),
          }),
        )
        .max(30)
        .default(DEFAULT_SMALL_TALK),
    })
    .prefault({}),
  persona: z
    .string()
    .trim()
    .max(4000)
    .default(
      "You are the helpful assistant for this website. Answer plainly and briefly, in the language of the question.",
    ),
  honestyReply: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .default(
      "I don't have that information. Please contact us and a person will help.",
    ),
  handoffLabel: z.string().trim().max(60).default("Contact us"),
  handoffUrl: z.string().trim().max(300).default(""),

  rules: z.string().max(3000).default(""),
  blockedTopics: z.string().max(3000).default(""),
  blockedReply: z.string().max(400).default(""),

  usePassages: z.boolean().default(true),
  aiWording: z.boolean().default(true),
  /** Off keeps answers to your content and tools; on lets the model answer from general knowledge too. */
  allowGeneral: z.boolean().default(false),
  embeddingEngine: z.enum(["needle", "workers-ai", "off"]).default("needle"),

  topK: z.number().int().min(1).max(8).default(3),
  minMatched: z.number().int().min(1).max(6).default(2),
  minCoverage: z.number().min(0).max(1).default(0.5),
  minCosine: z.number().min(-1).max(1).default(-0.05),
  cosWeight: z.number().min(0).max(2).default(0.3),
  /** One matching word is enough when the meaning agrees this strongly. */
  meaningCosine: z.number().min(-1).max(1).default(0.1),

  /** What to ask a visitor before their first message. Signed-in users are never asked. */
  visitorForm: z
    .object({
      enabled: z.boolean().default(true),
      name: z.enum(FIELD_MODES).default("required"),
      email: z.enum(FIELD_MODES).default("optional"),
      phone: z.enum(FIELD_MODES).default("optional"),
      location: z.enum(FIELD_MODES).default("off"),
      /** Needs an email or a phone number, whichever they prefer. */
      emailOrPhone: z.boolean().default(true),
      /** Offers a button asking the browser for an exact position. Never asked for automatically. */
      preciseLocation: z.boolean().default(false),
      intro: z
        .string()
        .trim()
        .max(300)
        .default(
          "Before we start, how can we reach you if we need to follow up?",
        ),
      notice: z
        .string()
        .trim()
        .max(500)
        .default(
          "We save these details, this chat, the page you are on and your approximate location so we can help you.",
        ),
    })
    .prefault({}),
  maxToolSteps: z.number().int().min(1).max(8).default(4),
  maxTokens: z.number().int().min(100).max(16000).default(1024),
  /** Model tokens a day across everyone; 0 means no limit. On by default so a public chat cannot run up a bill. */
  dailyTokenBudget: z.number().int().min(0).default(200_000),
  logRetentionDays: z.number().int().min(1).max(3650).default(90),

  providers: z.array(providerConfigSchema).max(20).default([]),
})
export type Settings = z.output<typeof settingsSchema>

export const parseSettings = (raw: unknown): Settings => {
  const r = settingsSchema.safeParse(raw ?? {})
  return r.success ? r.data : settingsSchema.parse({})
}

/** Whether this person may use the chat at all. Admins always can, so they can test it while it is off. */
export const canChat = (s: Settings, role: Role) =>
  role === "admin" ||
  (s.enabled &&
    (role === "user" ? s.allowUsers || s.allowPublic : s.allowPublic))
