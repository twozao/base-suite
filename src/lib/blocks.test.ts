import { describe, expect, it } from "vitest"
import {
  blocksOrMarkdown,
  blocksSchema,
  blocksToText,
  embedSrc,
  emptyBlock,
  publishProblems,
} from "./blocks"

describe("blocks", () => {
  it("accepts only YouTube and Vimeo players", () => {
    expect(embedSrc("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    )
    expect(embedSrc("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    )
    expect(embedSrc("https://vimeo.com/123456789")).toBe(
      "https://player.vimeo.com/video/123456789",
    )
    expect(embedSrc("http://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBeNull()
    expect(embedSrc("https://evil.example/embed/x")).toBeNull()
    expect(embedSrc("javascript:alert(1)")).toBeNull()
  })
  it("refuses unsafe links and images", () => {
    expect(
      blocksSchema.safeParse([
        { type: "button", label: "x", href: "javascript:alert(1)" },
      ]).success,
    ).toBe(false)
    expect(
      blocksSchema.safeParse([
        { type: "button", label: "x", href: "//evil.example" },
      ]).success,
    ).toBe(false)
    expect(
      blocksSchema.safeParse([{ type: "image", src: "http://x.test/a.png" }])
        .success,
    ).toBe(false)
    expect(
      blocksSchema.safeParse([{ type: "image", src: "/media/a.png" }]).success,
    ).toBe(true)
  })
  it("stops publishing without alt text", () => {
    expect(
      publishProblems([
        { ...emptyBlock("image"), src: "/media/a.png" } as never,
      ]),
    ).toHaveLength(1)
    expect(
      publishProblems([
        {
          ...emptyBlock("image"),
          src: "/media/a.png",
          decorative: true,
        } as never,
      ]),
    ).toHaveLength(0)
    expect(
      publishProblems([
        { ...emptyBlock("image"), src: "/media/a.png", alt: "A cat" } as never,
      ]),
    ).toHaveLength(0)
  })
  it("turns old Markdown into one text block and blocks into searchable text", () => {
    expect(blocksOrMarkdown(null, "# Hi")).toEqual([
      { type: "markdown", md: "# Hi" },
    ])
    expect(blocksOrMarkdown("[]", "# Hi")).toEqual([])
    expect(
      blocksToText([
        { type: "heading", level: 2, text: "Prices", anchor: "" },
        { type: "faq", items: [{ q: "Cost?", a: "Free" }] },
      ]),
    ).toContain("Cost?")
  })
})
