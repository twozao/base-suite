import { error, fail } from "@sveltejs/kit"
import { sendAdminEmail } from "$lib/mailer"
import {
  approvedComments,
  commentSchema,
  commentsOpen,
  ipHash,
  isSpammy,
  turnstileOk,
  turnstileSiteKey,
} from "$lib/server/comments"
import { getSettings } from "$lib/server/settings"
import { getStaff } from "$lib/server/auth/staff"
import { bumpCacheVersion } from "$lib/server/cache"
import { emit } from "$lib/server/plugins/events"
import { clientIp } from "$lib/server/security/request"
import { rateLimit, RATE_LIMITS } from "$lib/server/security/rate_limit"
import { excerptFrom } from "$lib/server/cms/markdown"
import { nowIso } from "$lib/server/db/json"
import { publishedPosts, relatedPosts, withTags } from "$lib/server/posts"
import type { Actions, PageServerLoad } from "./$types"
import { alternatesFor, translationOf } from "$lib/server/translations"

export const load: PageServerLoad = async ({ params, locals, parent }) => {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(params.slug)) error(404, "Not found")
  const now = nowIso()
  const row = await publishedPosts(locals.db, now)
    .select([
      "id",
      "slug",
      "title",
      "excerpt",
      "body_html",
      "cover_image_url",
      "author_name",
      "tags",
      "seo_title",
      "seo_description",
      "og_image_url",
      "seo_noindex",
      "published_at",
      "updated_at",
    ])
    .where("slug", "=", params.slug)
    .executeTakeFirst()
  if (!row) error(404, "Post not found")
  const { site } = await parent()
  if (site.locale !== site.defaultLocale) {
    const tr = await translationOf(locals.db, "post", row.id, site.locale)
    if (tr)
      Object.assign(row, {
        title: tr.title,
        excerpt: tr.excerpt,
        body_html: tr.body_html,
        seo_title: null,
        seo_description: null,
      })
  }
  const post = withTags(row)

  const related = await relatedPosts(locals.db, post.slug, post.tags, 3, now)
  const { comments: commentSettings } = await getSettings(locals.db)
  const open = commentsOpen(commentSettings, post.published_at)
  const comments = commentSettings.enabled
    ? await approvedComments(locals.db, post.id)
    : []

  const words = post.body_html
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length
  return {
    post,
    readingMinutes: Math.max(1, Math.round(words / 220)),
    metaTitle: post.seo_title || post.title,
    metaDescription:
      post.seo_description || post.excerpt || excerptFrom(post.body_html),
    related,
    alternates: await alternatesFor(
      locals.db,
      "post",
      post.id,
      `/blog/${post.slug}`,
      site,
    ),
    comments: {
      enabled: commentSettings.enabled,
      open,
      list: comments,
      turnstile: turnstileSiteKey(),
    },
  }
}

export const actions: Actions = {
  comment: async (event) => {
    const { locals, params } = event
    const db = locals.db
    const form = await event.request.formData()
    const values = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      body: String(form.get("body") ?? ""),
    }
    // Bots fill in every field, including this hidden one.
    if (String(form.get("website") ?? ""))
      return { commented: true, pending: true }
    const post = await db
      .selectFrom("posts")
      .select(["id", "title", "published_at"])
      .where("slug", "=", params.slug)
      .where("status", "=", "published")
      .executeTakeFirst()
    if (!post) error(404, "Not found")
    const { comments: settings } = await getSettings(db)
    if (!commentsOpen(settings, post.published_at))
      return fail(403, { commentError: "Comments are closed", values })
    const parsed = commentSchema.safeParse({
      ...values,
      parent: String(form.get("parent") ?? ""),
    })
    if (!parsed.success)
      return fail(400, { commentError: parsed.error.issues[0].message, values })
    const ip = clientIp(event)
    if (!(await rateLimit(db, `comment:${ip}`, RATE_LIMITS.comment)))
      return fail(429, {
        commentError: "Too many comments. Try again in a few minutes.",
        values,
      })
    if (
      !(await turnstileOk(
        String(form.get("cf-turnstile-response") ?? "") || null,
        ip,
      ))
    )
      return fail(400, {
        commentError: "Please complete the check and try again",
        values,
      })
    const d = parsed.data
    if (d.parent) {
      const parent = await db
        .selectFrom("comments")
        .select("id")
        .where("id", "=", d.parent)
        .where("post_id", "=", post.id)
        .where("status", "=", "approved")
        .executeTakeFirst()
      if (!parent)
        return fail(400, { commentError: "That comment is gone", values })
    }
    const staff = locals.user ? await getStaff(event) : null
    const status = isSpammy(d.body)
      ? "spam"
      : staff || !settings.requireApproval
        ? "approved"
        : "pending"
    const row = await db
      .insertInto("comments")
      .values({
        post_id: post.id,
        parent_id: d.parent ?? null,
        author_name: d.name,
        author_email: d.email || null,
        user_id: locals.user?.id ?? null,
        body: d.body,
        status,
        ip_hash: await ipHash(ip),
      })
      .returning("id")
      .executeTakeFirst()
    if (status === "approved") await bumpCacheVersion(db)
    if (status !== "spam") {
      await emit(db, "comment.created", {
        id: Number(row?.id),
        post: params.slug,
        status,
      })
      if (settings.notifyAdmin)
        await sendAdminEmail({
          db: event.locals.db,
          subject: `New comment on ${post.title}`,
          body: `${d.name} wrote:\n\n${d.body}\n\n${event.url.origin}/admin/comments`,
        })
    }
    return { commented: true, pending: status !== "approved" }
  },
}
