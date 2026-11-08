import sanitizeHtml from "sanitize-html"
import { embedSrc, parseBlocks, type Block } from "$lib/blocks"
import type { Db } from "../db"
import { renderMarkdown, SANITIZE } from "./markdown"

// Blocks become HTML once, when content is saved, and the result goes through the same sanitiser as
// Markdown plus a few block-only allowances (bs-* classes, srcset, YouTube and Vimeo players).

const BLOCK_SANITIZE: sanitizeHtml.IOptions = {
  ...SANITIZE,
  allowedTags: [...(SANITIZE.allowedTags as string[]), "section", "iframe"],
  allowedAttributes: {
    ...(SANITIZE.allowedAttributes as Record<string, string[]>),
    img: [
      ...((SANITIZE.allowedAttributes as Record<string, string[]>).img ?? []),
      "srcset",
      "sizes",
    ],
    iframe: [
      "src",
      "title",
      "allow",
      "allowfullscreen",
      "loading",
      "referrerpolicy",
    ],
    details: ["name"],
    "*": ["id", "class"],
  },
  allowedClasses: {
    code: [/^language-[a-z0-9-]+$/],
    "*": [/^bs-[a-z0-9-]+$/],
  },
  allowedIframeHostnames: ["www.youtube-nocookie.com", "player.vimeo.com"],
  allowedSchemesByTag: { img: ["https", "data"], iframe: ["https"] },
}

export const sanitizeBlocksHtml = (html: string) =>
  sanitizeHtml(html, BLOCK_SANITIZE)

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

const MEDIA_SRC = /^\/media\/([^/?#]+)$/
type MediaInfo = {
  width: number | null
  variants: number[]
  alt: string | null
}

/** Width variants and stored alt text for every /media/ image the blocks use, in one query. */
const mediaFor = async (db: Db, blocks: Block[]) => {
  const names = new Set<string>()
  const add = (src: string) => {
    const m = MEDIA_SRC.exec(src)
    if (m) names.add(m[1])
  }
  for (const b of blocks) {
    if (b.type === "image") add(b.src)
    if (b.type === "gallery") b.images.forEach((i) => add(i.src))
  }
  const out = new Map<string, MediaInfo>()
  if (!names.size) return out
  const rows = await db
    .selectFrom("media")
    .select(["name", "width", "variants", "alt"])
    .where("name", "in", [...names])
    .execute()
  for (const r of rows) {
    let variants: number[] = []
    try {
      variants = (JSON.parse(r.variants) as unknown[]).filter(
        (n): n is number => typeof n === "number",
      )
    } catch {
      /* no variants */
    }
    out.set(r.name, { width: r.width, variants, alt: r.alt })
  }
  return out
}

/** The stored name of a resized copy: photo.jpg at 480 wide is photo-w480.webp. */
export const variantName = (name: string, width: number) =>
  `${name.replace(/\.[a-z0-9]+$/, "")}-w${width}.webp`

const imgTag = (
  src: string,
  alt: string,
  media: Map<string, MediaInfo>,
  sizes: string,
) => {
  const m = MEDIA_SRC.exec(src)
  const info = m ? media.get(m[1]) : undefined
  let srcset = ""
  if (m && info?.variants.length) {
    const parts = info.variants
      .slice()
      .sort((a, b) => a - b)
      .map((w) => `/media/${variantName(m[1], w)} ${w}w`)
    if (info.width) parts.push(`${src} ${info.width}w`)
    srcset = ` srcset="${esc(parts.join(", "))}" sizes="${esc(sizes)}"`
  }
  return `<img src="${esc(src)}" alt="${esc(alt)}"${srcset} loading="lazy" decoding="async">`
}

type RenderOptions = {
  /** Turns an app block into core blocks; supplied by the apps layer. */
  renderApp?: (b: Extract<Block, { type: "app" }>) => Promise<Block[]>
  /** Reusable blocks already being rendered, so one cannot include itself. */
  seen?: Set<string>
}

/** Renders blocks to sanitised HTML. */
export const renderBlocks = async (
  db: Db,
  blocks: Block[],
  opts: RenderOptions = {},
): Promise<string> => {
  const media = await mediaFor(db, blocks)
  const seen = opts.seen ?? new Set<string>()
  const parts: string[] = []
  for (const b of blocks) {
    parts.push(await renderOne(db, b, media, { ...opts, seen }))
  }
  return sanitizeBlocksHtml(parts.join("\n"))
}

const renderOne = async (
  db: Db,
  b: Block,
  media: Map<string, MediaInfo>,
  opts: RenderOptions & { seen: Set<string> },
): Promise<string> => {
  switch (b.type) {
    case "heading":
      return b.text
        ? `<h${b.level}${b.anchor ? ` id="${esc(b.anchor)}"` : ""}>${esc(b.text)}</h${b.level}>`
        : ""
    case "markdown":
      return renderMarkdown(b.md)
    case "image": {
      if (!b.src) return ""
      const img = imgTag(
        b.src,
        b.decorative ? "" : b.alt,
        media,
        b.wide ? "100vw" : "(min-width: 800px) 768px, 100vw",
      )
      return `<figure class="bs-image${b.wide ? " bs-wide" : ""}">${img}${b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ""}</figure>`
    }
    case "gallery": {
      const items = b.images
        .filter((i) => i.src)
        .map(
          (i) =>
            `<figure>${imgTag(i.src, i.decorative ? "" : i.alt, media, `(min-width: 800px) ${Math.round(768 / b.columns)}px, 50vw`)}${i.caption ? `<figcaption>${esc(i.caption)}</figcaption>` : ""}</figure>`,
        )
      return items.length
        ? `<div class="bs-gallery bs-cols-${b.columns}">${items.join("")}</div>`
        : ""
    }
    case "quote":
      return b.text
        ? `<blockquote class="bs-quote"><p>${esc(b.text)}</p>${b.cite ? `<p class="bs-cite">${esc(b.cite)}</p>` : ""}</blockquote>`
        : ""
    case "button":
      return b.label && b.href
        ? `<p class="bs-buttons"><a class="bs-button bs-${b.style}" href="${esc(b.href)}">${esc(b.label)}</a></p>`
        : ""
    case "columns":
      return `<div class="bs-columns bs-cols-${b.columns.length}">${b.columns.map((c) => `<div>${renderMarkdown(c.md)}</div>`).join("")}</div>`
    case "embed": {
      const player = embedSrc(b.url)
      return player
        ? `<div class="bs-embed"><iframe src="${esc(player)}" title="${esc(b.title || "Video")}" loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`
        : ""
    }
    case "divider":
      return "<hr>"
    case "faq":
      return b.items.length
        ? `<div class="bs-faq">${b.items
            .filter((i) => i.q)
            .map(
              (i) =>
                `<details><summary>${esc(i.q)}</summary>${renderMarkdown(i.a)}</details>`,
            )
            .join("")}</div>`
        : ""
    case "cta":
      return b.title || b.text
        ? `<section class="bs-cta">${b.title ? `<h2>${esc(b.title)}</h2>` : ""}${b.text ? `<p>${esc(b.text)}</p>` : ""}${b.label && b.href ? `<p class="bs-buttons"><a class="bs-button bs-primary" href="${esc(b.href)}">${esc(b.label)}</a></p>` : ""}</section>`
        : ""
    case "html":
      return b.html
    case "form":
      return b.slug
        ? `<section class="bs-cta">${b.title ? `<h2>${esc(b.title)}</h2>` : ""}${b.text ? `<p>${esc(b.text)}</p>` : ""}<p class="bs-buttons"><a class="bs-button bs-primary" href="/forms/${esc(b.slug)}">${esc(b.label || "Open the form")}</a></p></section>`
        : ""
    case "reusable": {
      if (!b.ref || opts.seen.has(b.ref)) return ""
      const row = await db
        .selectFrom("cms_blocks")
        .select("blocks_json")
        .where("id", "=", b.ref)
        .executeTakeFirst()
      if (!row) return ""
      const inner = parseBlocks(row.blocks_json)
      const seen = new Set(opts.seen).add(b.ref)
      const innerMedia = await mediaFor(db, inner)
      const html: string[] = []
      for (const x of inner)
        html.push(await renderOne(db, x, innerMedia, { ...opts, seen }))
      return html.join("\n")
    }
    case "app": {
      if (!opts.renderApp) return ""
      try {
        const inner = await opts.renderApp(b)
        // App output is core blocks only, and never other app blocks.
        const safe = inner.filter((x) => x.type !== "app")
        const innerMedia = await mediaFor(db, safe)
        const html: string[] = []
        for (const x of safe)
          html.push(await renderOne(db, x, innerMedia, opts))
        return html.join("\n")
      } catch {
        return ""
      }
    }
  }
}
