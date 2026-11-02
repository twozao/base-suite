import { describe, expect, it } from "vitest"
import { safeNextPath } from "./safe_redirect"

describe("safeNextPath", () => {
  it("allows relative paths", () => {
    expect(safeNextPath("/admin/users?q=a")).toBe("/admin/users?q=a")
  })
  it.each([
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "\\\\evil.com",
    "javascript:alert(1)",
    "/\tevil",
    "",
    null,
  ])("rejects %s", (bad) => {
    expect(safeNextPath(bad as string)).toBe("/account")
  })
})
