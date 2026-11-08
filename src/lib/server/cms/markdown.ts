import { Marked } from "marked"
import sanitizeHtml from "sanitize-html"

// Markdown is rendered and sanitised ONCE, when an editor saves a page. The
// stored HTML is then served as-is, so public page views cost nothing extra and
// even a compromised editor account cannot inject script into the site.

const marked = new Marked({ gfm: true, breaks: false, async: false })

const SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: [
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "br",
    "hr",
    "blockquote",
    "ul",
    "ol",
    "li",
    "strong",
    "em",
    "del",
    "code",
    "pre",
    "a",
    "img",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "figure",
    "figcaption",
    "details",
    "summary",
    "sup",
    "sub",
    "kbd",
    "mark",
    "span",
    "div",
  ],
  allowedAttributes: {
    a: ["href", "title", "name", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "loading", "decoding"],
    th: ["align"],
    td: ["align"],
    code: ["class"],
    "*": ["id"],
  },
  allowedClasses: { code: [/^language-[a-z0-9-]+$/] },
  allowedSchemes: ["https", "http", "mailto", "tel"],
  allowedSchemesByTag: { img: ["https", "data"] },
  allowedSchemesAppliedToAttributes: ["href", "src"],
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs) => {
      const href = attribs.href ?? ""
      const external = /^https?:\/\//i.test(href)
      return {
        tagName,
        attribs: external
          ? {
              ...attribs,
              target: "_blank",
              rel: "noopener noreferrer nofollow",
            }
          : { ...attribs, rel: attribs.rel ?? "" },
      }
    },
    img: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, loading: "lazy", decoding: "async" },
    }),
  },
  exclusiveFilter: (frame) =>
    frame.tag === "img" &&
    (frame.attribs.src ?? "").startsWith("data:") &&
    !/^data:image\/(png|jpeg|gif|webp);base64,/i.test(frame.attribs.src ?? ""),
}

export const sanitize = (html: string): string => sanitizeHtml(html, SANITIZE)

export const renderMarkdown = (markdown: string): string =>
  sanitize(marked.parse(markdown) as string)

/** Plain-text excerpt for meta descriptions when none is set. */
export const excerptFrom = (html: string, max = 160): string => {
  const text = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim()
  return text.length > max ? text.slice(0, max - 1).trimEnd() + "..." : text
}
