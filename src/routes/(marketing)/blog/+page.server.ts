import { nowIso } from "$lib/server/db/json"
import {
  TAG_RE,
  countPublishedPosts,
  listPostCards,
  publishedTags,
} from "$lib/server/posts"
import type { PageServerLoad } from "./$types"

const PAGE_SIZE = 9

export const load: PageServerLoad = async ({ locals, url }) => {
  const tag = (url.searchParams.get("tag") ?? "")
    .trim()
    .toLowerCase()
    .slice(0, 40)
  const raw = Number(url.searchParams.get("page"))
  const page = Number.isInteger(raw) && raw > 0 && raw < 1000 ? raw : 1
  const from = (page - 1) * PAGE_SIZE
  const db = locals.db
  const now = nowIso()

  // A tag that could never have been saved matches nothing; skip the query.
  if (tag && !TAG_RE.test(tag)) {
    return {
      posts: [],
      total: 0,
      page,
      pages: 1,
      tag,
      tags: await publishedTags(db, now),
    }
  }

  const [posts, total, tags] = await Promise.all([
    listPostCards(db, { tag, limit: PAGE_SIZE, offset: from, now }),
    countPublishedPosts(db, { tag, now }),
    publishedTags(db, now),
  ])

  return {
    posts,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    tag,
    tags,
  }
}
