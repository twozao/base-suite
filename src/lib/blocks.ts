import { z } from "zod"

// Page content as a list of blocks. Shared by the editor (browser) and the renderer (server);
// the server validates with these schemas and turns blocks into sanitised HTML once, on save.

const text = (max: number) => z.string().max(max).default("")
const href = z
  .string()
  .trim()
  .max(1000)
  .refine(
    (v) =>
      v === "" ||
      (/^\/(?![/\\])/.test(v) && !v.includes("\\")) ||
      /^https?:\/\/[^\s]+$/i.test(v) ||
      /^mailto:[^\s]+$/i.test(v) ||
      /^tel:[+\d\s()-]+$/i.test(v) ||
      v.startsWith("#"),
    "Use a path like /pricing, a full https:// link, mailto: or tel:",
  )
  .default("")
const src = z
  .string()
  .trim()
  .max(1000)
  .refine(
    (v) => v === "" || /^\/(?![/\\])/.test(v) || /^https:\/\/[^\s]+$/i.test(v),
    "Use an image from Media or an https:// address",
  )
  .default("")
const imageItem = z.object({
  src,
  alt: text(300),
  caption: text(300),
  decorative: z.boolean().default(false),
})

export const blockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("heading"),
    level: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(2),
    text: text(300),
    anchor: z
      .string()
      .max(60)
      .regex(/^[a-z0-9-]*$/, "Anchor: lowercase letters, numbers and dashes")
      .default(""),
  }),
  z.object({ type: z.literal("markdown"), md: text(100_000) }),
  z.object({
    type: z.literal("image"),
    ...imageItem.shape,
    wide: z.boolean().default(false),
  }),
  z.object({
    type: z.literal("gallery"),
    images: z.array(imageItem).max(40).default([]),
    columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
  }),
  z.object({ type: z.literal("quote"), text: text(2000), cite: text(200) }),
  z.object({
    type: z.literal("button"),
    label: text(80),
    href,
    style: z.enum(["primary", "outline"]).default("primary"),
  }),
  z.object({
    type: z.literal("columns"),
    columns: z
      .array(z.object({ md: text(20_000) }))
      .min(2)
      .max(3)
      .default([{ md: "" }, { md: "" }]),
  }),
  z.object({
    type: z.literal("embed"),
    url: z.string().trim().max(500).default(""),
    title: text(200),
  }),
  z.object({ type: z.literal("divider") }),
  z.object({
    type: z.literal("faq"),
    items: z
      .array(z.object({ q: text(300), a: text(5000) }))
      .max(50)
      .default([]),
  }),
  z.object({
    type: z.literal("cta"),
    title: text(200),
    text: text(1000),
    label: text(80),
    href,
  }),
  z.object({ type: z.literal("html"), html: text(200_000) }),
  z.object({
    type: z.literal("reusable"),
    ref: z.string().max(40).default(""),
  }),
  z.object({
    type: z.literal("form"),
    slug: z
      .string()
      .max(80)
      .regex(/^([a-z0-9]+(-[a-z0-9]+)*)?$/)
      .default(""),
    title: text(200),
    text: text(500),
    label: text(60),
  }),
  z.object({
    type: z.literal("app"),
    app: z.string().max(40).default(""),
    block: z.string().max(60).default(""),
    props: z.record(z.string(), z.string().max(2000)).default({}),
  }),
])

export type Block = z.output<typeof blockSchema>
export type BlockType = Block["type"]
export const blocksSchema = z.array(blockSchema).max(300)

export const BLOCK_TYPES: { type: BlockType; label: string; hint: string }[] = [
  {
    type: "markdown",
    label: "Text",
    hint: "Paragraphs, lists, links and images",
  },
  { type: "heading", label: "Heading", hint: "A section title" },
  {
    type: "image",
    label: "Image",
    hint: "One image with alt text and caption",
  },
  { type: "gallery", label: "Gallery", hint: "A grid of images" },
  { type: "columns", label: "Columns", hint: "Two or three columns of text" },
  { type: "quote", label: "Quote", hint: "A quote with who said it" },
  { type: "button", label: "Button", hint: "A link styled as a button" },
  {
    type: "cta",
    label: "Call to action",
    hint: "A highlighted box with a button",
  },
  { type: "faq", label: "FAQ", hint: "Questions that open to show the answer" },
  { type: "embed", label: "Video", hint: "A YouTube or Vimeo video" },
  { type: "divider", label: "Divider", hint: "A line between sections" },
  { type: "html", label: "HTML", hint: "Raw HTML, cleaned of scripts on save" },
  {
    type: "reusable",
    label: "Reusable block",
    hint: "A block kept in one place and used on many pages",
  },
  { type: "form", label: "Form", hint: "A box that opens one of your forms" },
  { type: "app", label: "App block", hint: "Content from a connected app" },
]

/** A new, empty block of a type, with every default filled in. */
export const emptyBlock = (type: BlockType): Block =>
  blockSchema.parse({ type })

/** Parses stored JSON; anything invalid becomes an empty list rather than an error on a public page. */
export const parseBlocks = (json: string | null | undefined): Block[] => {
  if (!json) return []
  try {
    const parsed = blocksSchema.safeParse(JSON.parse(json))
    return parsed.success ? parsed.data : []
  } catch {
    return []
  }
}

/** Blocks for content saved before blocks existed: its Markdown becomes one Text block. */
export const blocksOrMarkdown = (
  json: string | null | undefined,
  markdown: string,
): Block[] => {
  const blocks = parseBlocks(json)
  if (blocks.length || json) return blocks
  return markdown.trim() ? [{ type: "markdown", md: markdown }] : []
}

/** Problems that stop publishing: images without alt text, buttons without a link, empty embeds. */
export const publishProblems = (blocks: Block[]): string[] => {
  const out: string[] = []
  blocks.forEach((b, i) => {
    const at = `Block ${i + 1}`
    if (b.type === "image" && b.src && !b.alt.trim() && !b.decorative)
      out.push(`${at}: add alt text to the image, or mark it decorative`)
    if (b.type === "gallery")
      b.images.forEach((img, j) => {
        if (img.src && !img.alt.trim() && !img.decorative)
          out.push(`${at}: image ${j + 1} in the gallery needs alt text`)
      })
    if ((b.type === "button" || b.type === "cta") && b.label && !b.href)
      out.push(`${at}: the button needs a link`)
    if (b.type === "embed" && b.url && !embedSrc(b.url))
      out.push(`${at}: only YouTube and Vimeo links can be embedded`)
    if (b.type === "reusable" && !b.ref)
      out.push(`${at}: pick a reusable block`)
    if (b.type === "form" && !b.slug) out.push(`${at}: pick a form`)
  })
  return out
}

/** The player address for a YouTube or Vimeo link, or null for anything else. */
export const embedSrc = (url: string): string | null => {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return null
  }
  if (u.protocol !== "https:") return null
  const host = u.hostname.replace(/^www\./, "")
  const id = (re: RegExp, v: string) => (re.test(v) ? v : null)
  if (host === "youtube.com" || host === "m.youtube.com") {
    const v = id(/^[A-Za-z0-9_-]{6,20}$/, u.searchParams.get("v") ?? "")
    if (v) return `https://www.youtube-nocookie.com/embed/${v}`
    const m = /^\/(?:embed|shorts)\/([A-Za-z0-9_-]{6,20})$/.exec(u.pathname)
    return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null
  }
  if (host === "youtu.be") {
    const v = id(/^[A-Za-z0-9_-]{6,20}$/, u.pathname.slice(1))
    return v ? `https://www.youtube-nocookie.com/embed/${v}` : null
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const m = /\/(?:video\/)?(\d{5,12})$/.exec(u.pathname)
    return m ? `https://player.vimeo.com/video/${m[1]}` : null
  }
  return null
}

/** Searchable plain text of the blocks, stored as body_md so search and the assistant can read it. */
export const blocksToText = (blocks: Block[]): string =>
  blocks
    .map((b) => {
      switch (b.type) {
        case "heading":
          return `${"#".repeat(b.level)} ${b.text}`
        case "markdown":
          return b.md
        case "quote":
          return `> ${b.text}${b.cite ? `\n> ${b.cite}` : ""}`
        case "columns":
          return b.columns.map((c) => c.md).join("\n\n")
        case "faq":
          return b.items.map((i) => `**${i.q}**\n${i.a}`).join("\n\n")
        case "cta":
          return [b.title, b.text].filter(Boolean).join("\n")
        case "image":
          return b.caption
        case "html":
          return b.html
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
        default:
          return ""
      }
    })
    .filter((t) => t.trim())
    .join("\n\n")
