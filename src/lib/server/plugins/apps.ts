import { z } from "zod"
import { blocksSchema, type Block } from "$lib/blocks"
import type { Db } from "../db"
import { hmacSha256Hex } from "../security/crypto"
import { fetchPublic, publicHttpsUrl } from "../security/outbound"
import { openValue } from "../security/vault"

// Apps are code that runs somewhere else (their own Worker or server). The site sends them signed
// requests and they answer with data; they never run inside the site or touch its database.

export const APP_SECRET_CONTEXT = (id: string) => `app:${id}`

/** Signature header the site sends: t=<unix seconds>,v1=<hex HMAC-SHA256 of "t.body">. */
export const signBody = async (
  secret: string,
  body: string,
  at = Date.now(),
) => {
  const t = Math.floor(at / 1000)
  return `t=${t},v1=${await hmacSha256Hex(secret, `${t}.${body}`)}`
}

export const appBlockListSchema = z
  .array(
    z.object({
      name: z
        .string()
        .trim()
        .regex(
          /^[a-z0-9-]{1,60}$/,
          "Block names: lowercase letters, numbers and dashes",
        ),
      label: z.string().trim().min(1).max(80),
      props: z
        .array(
          z.object({
            key: z.string().regex(/^[a-z0-9_]{1,40}$/),
            label: z.string().trim().min(1).max(80),
          }),
        )
        .max(20)
        .default([]),
    }),
  )
  .max(30)

export type AppBlockDef = z.output<typeof appBlockListSchema>[number]

export const appBaseUrl = (raw: string): string | { error: string } => {
  const u = publicHttpsUrl(raw.trim().replace(/\/+$/, ""))
  if (typeof u === "string") return { error: u }
  return u.origin + u.pathname.replace(/\/+$/, "")
}

const enabledApp = (db: Db, id: string) =>
  db
    .selectFrom("apps")
    .select(["id", "base_url", "secret", "blocks", "enabled"])
    .where("id", "=", id)
    .where("enabled", "=", 1)
    .executeTakeFirst()

/** Sends a signed JSON request to an app and returns its parsed JSON answer, or null. */
export const callApp = async (
  db: Db,
  id: string,
  path: string,
  payload: unknown,
  timeoutMs = 3000,
): Promise<unknown> => {
  const app = await enabledApp(db, id)
  if (!app) return null
  const secret = openValue(app.secret, APP_SECRET_CONTEXT(app.id))
  if (!secret) return null
  const body = JSON.stringify(payload)
  const r = await fetchPublic(`${app.base_url}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-base-suite-signature": await signBody(secret, body),
    },
    body,
    timeoutMs,
    maxBytes: 512 * 1024,
  })
  if (!r.ok || !r.res.ok) return null
  try {
    return JSON.parse(new TextDecoder().decode(r.bytes))
  } catch {
    return null
  }
}

/** Asks the app to render one of its blocks. The answer must be core blocks; anything else is dropped. */
export const renderAppBlock = async (
  db: Db,
  b: Extract<Block, { type: "app" }>,
): Promise<Block[]> => {
  if (!b.app || !b.block) return []
  const app = await enabledApp(db, b.app)
  if (!app) return []
  let defs: AppBlockDef[] = []
  try {
    defs = appBlockListSchema.parse(JSON.parse(app.blocks))
  } catch {
    return []
  }
  if (!defs.some((d) => d.name === b.block)) return []
  const answer = await callApp(db, b.app, "/blocks/render", {
    block: b.block,
    props: b.props,
  })
  const parsed = z.object({ blocks: blocksSchema }).safeParse(answer)
  return parsed.success
    ? parsed.data.blocks.filter((x) => x.type !== "app")
    : []
}
