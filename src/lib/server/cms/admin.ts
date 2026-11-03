import { fail, type RequestEvent } from "@sveltejs/kit"
import { pageInputSchema, slugify } from "./pages"
import { renderMarkdown } from "./markdown"

/** Parse and validate the page editor form. */
export const parsePageForm = async (event: RequestEvent) => {
  const form = await event.request.formData()
  const title = String(form.get("title") ?? "")
  const raw = {
    title,
    slug: String(form.get("slug") ?? "") || slugify(title),
    body_md: String(form.get("body_md") ?? ""),
    excerpt: String(form.get("excerpt") ?? ""),
    seo_title: String(form.get("seo_title") ?? ""),
    seo_description: String(form.get("seo_description") ?? ""),
  }
  const parsed = pageInputSchema.safeParse(raw)
  if (!parsed.success) {
    const errors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      errors[String(issue.path[0] ?? "_")] ??= issue.message
    }
    return { failure: fail(400, { errors, values: raw }) }
  }
  return {
    input: parsed.data,
    values: raw,
    publish: form.get("intent") === "publish",
  }
}

export const htmlFor = (markdown: string) => renderMarkdown(markdown)

/** Parse and validate the blog post editor form. */
export const parsePostForm = async (event: RequestEvent) => {
  const { postInputSchema } = await import("../posts")
  const form = await event.request.formData()
  const title = String(form.get("title") ?? "")
  const raw = {
    title,
    slug: String(form.get("slug") ?? "") || slugify(title),
    body_md: String(form.get("body_md") ?? ""),
    excerpt: String(form.get("excerpt") ?? ""),
    seo_title: String(form.get("seo_title") ?? ""),
    seo_description: String(form.get("seo_description") ?? ""),
    cover_image_url: String(form.get("cover_image_url") ?? ""),
    author_name: String(form.get("author_name") ?? ""),
    tags: String(form.get("tags") ?? ""),
    published_at: String(form.get("published_at") ?? ""),
  }
  const parsed = postInputSchema.safeParse(raw)
  if (!parsed.success) {
    const errors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      errors[String(issue.path[0] ?? "_")] ??= issue.message
    }
    return { failure: fail(400, { errors, values: raw }) }
  }
  return {
    input: parsed.data,
    values: raw,
    publish: form.get("intent") === "publish",
  }
}
