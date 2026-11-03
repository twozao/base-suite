import { describe, expect, it } from "vitest"
import { countablePath, isBot, referrerHost } from "./analytics"

describe("analytics", () => {
  it("counts public paths only", () => {
    expect(countablePath("/blog/hello/")).toBe("/blog/hello")
    expect(countablePath("/")).toBe("/")
    expect(countablePath("/admin/users")).toBeNull()
    expect(countablePath("/account")).toBeNull()
    expect(countablePath("/x?email=a@b.c")).toBeNull()
    expect(countablePath("<script>")).toBeNull()
  })
  it("keeps only external referrer hosts", () => {
    expect(
      referrerHost("https://www.Google.com/search?q=x", "example.com"),
    ).toBe("google.com")
    expect(referrerHost("https://example.com/blog", "example.com")).toBeNull()
    expect(referrerHost("javascript:alert(1)", "example.com")).toBeNull()
  })
  it("skips bots", () => {
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true)
    expect(isBot("Mozilla/5.0 (Macintosh) Safari/605")).toBe(false)
  })
})
