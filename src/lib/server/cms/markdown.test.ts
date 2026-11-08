import { describe, expect, it } from "vitest"
import { excerptFrom, renderMarkdown } from "./markdown"

describe("renderMarkdown", () => {
  it("renders markdown", () => {
    const html = renderMarkdown("# Hello\n\n**bold** [link](/about)")
    expect(html).toContain("<h1")
    expect(html).toContain("<strong>bold</strong>")
    expect(html).toContain('href="/about"')
  })
  it.each([
    "<script>alert(1)</script>",
    '<img src=x onerror="alert(1)">',
    "[x](javascript:alert(1))",
    '<a href="JaVaScRiPt:alert(1)">x</a>',
    '<iframe src="https://evil.com"></iframe>',
    '<svg onload="alert(1)"></svg>',
    "<style>body{display:none}</style>",
    '<div style="background:url(javascript:alert(1))">x</div>',
    '<img src="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=">',
  ])("strips dangerous input: %s", (input) => {
    const html = renderMarkdown(input).toLowerCase()
    expect(html).not.toContain("<script")
    expect(html).not.toContain("onerror")
    expect(html).not.toContain("onload")
    expect(html).not.toContain("javascript:")
    expect(html).not.toContain("<iframe")
    expect(html).not.toContain("<style")
    expect(html).not.toContain("style=")
    expect(html).not.toContain("image/svg")
  })
  it("hardens external links", () => {
    const html = renderMarkdown("[x](https://example.com)")
    expect(html).toContain('rel="noopener noreferrer nofollow"')
  })
  it("lazy-loads images", () => {
    expect(renderMarkdown("![a](https://example.com/a.png)")).toContain(
      'loading="lazy"',
    )
  })
})

describe("excerptFrom", () => {
  it("strips tags and truncates", () => {
    expect(excerptFrom("<p>Hello <b>world</b></p>", 8)).toBe("Hello w...")
  })
})
