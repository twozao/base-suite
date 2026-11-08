import { z } from "zod"
import type { Db } from "./db"
import { containsText } from "./db/query"

export const kbArticleSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers and dashes",
    )
    .max(120),
  excerpt: z.string().trim().max(500),
  body_md: z.string().max(200_000),
  category_id: z.string().max(60).nullable(),
  status: z.enum(["draft", "published"]),
})

export const publishedArticles = (db: Db) =>
  db.selectFrom("kb_articles").where("status", "=", "published")

export const searchArticles = (db: Db, q: string, limit = 20) =>
  publishedArticles(db)
    .select(["slug", "title", "excerpt"])
    .where((eb) =>
      eb.or([
        containsText("title", q),
        containsText("excerpt", q),
        containsText("body_md", q),
      ]),
    )
    .limit(limit)
    .execute()

export const helpfulScore = (yes: number, no: number) =>
  yes + no === 0 ? null : Math.round((yes / (yes + no)) * 100)
