import { env } from "$env/dynamic/private"
import { env as publicEnv } from "$env/dynamic/public"
import { z } from "zod"
import type { Db } from "./db"
import { sha256Hex } from "./security/crypto"

// Comments on blog posts. New comments wait for a moderator unless the site says otherwise; links are
// limited, a hidden field catches simple bots, and Cloudflare Turnstile is used when its keys are set.

export const commentSchema = z.object({
  name: z.string().trim().min(1, "Add your name").max(100),
  email: z.string().trim().max(320).email("Check the email").or(z.literal("")),
  body: z
    .string()
    .trim()
    .min(2, "Write a comment")
    .max(5000, "5000 characters at most"),
  parent: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .or(z.literal("").transform(() => undefined)),
})

const MAX_LINKS = 2

export const isSpammy = (body: string) =>
  (body.match(/https?:\/\//gi) ?? []).length > MAX_LINKS

export const commentsOpen = (
  settings: { enabled: boolean; closeAfterDays: number },
  publishedAt: string | null,
  now = Date.now(),
) => {
  if (!settings.enabled) return false
  if (!settings.closeAfterDays || !publishedAt) return true
  return now - Date.parse(publishedAt) < settings.closeAfterDays * 86_400_000
}

/** Approved comments for a post, oldest first, with replies under their parent. */
export const approvedComments = async (db: Db, postId: string) => {
  const rows = await db
    .selectFrom("comments")
    .select(["id", "parent_id", "author_name", "body", "created_at", "user_id"])
    .where("post_id", "=", postId)
    .where("status", "=", "approved")
    .orderBy("created_at")
    .limit(500)
    .execute()
  const top = rows.filter((r) => !r.parent_id)
  return top.map((c) => ({
    ...c,
    id: Number(c.id),
    replies: rows
      .filter((r) => Number(r.parent_id) === Number(c.id))
      .map((r) => ({ ...r, id: Number(r.id) })),
  }))
}

export const turnstileSiteKey = () => publicEnv.PUBLIC_TURNSTILE_SITE_KEY || ""

/** True when Turnstile is off, or the token checks out with Cloudflare. */
export const turnstileOk = async (token: string | null, ip: string) => {
  if (!env.TURNSTILE_SECRET_KEY) return true
  if (!token) return false
  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: new URLSearchParams({
          secret: env.TURNSTILE_SECRET_KEY,
          response: token,
          remoteip: ip,
        }),
        signal: AbortSignal.timeout(5000),
      },
    )
    return !!((await res.json()) as { success?: boolean }).success
  } catch {
    return false
  }
}

export const ipHash = (ip: string) => sha256Hex(`comment:${ip}`)
