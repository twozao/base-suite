import { describe, expect, it } from "vitest"
import { resolveActive } from "./modules"

describe("resolveActive", () => {
  it("activates installed modules that are switched on", () => {
    const a = resolveActive({ chat: true, crm: false })
    expect(a.has("chat")).toBe(true)
    expect(a.has("crm")).toBe(false)
  })
  it("ignores unknown / not-installed module ids", () => {
    expect([...resolveActive({ helpdesk: true })]).not.toContain("helpdesk")
  })
})

describe("admin menu", () => {
  it("has a place in the menu order for every item", async () => {
    const { ALL_ADMIN_NAV, NAV_ORDER } = await import("./modules")
    expect(
      ALL_ADMIN_NAV.map((i) => i.href).filter((h) => !NAV_ORDER.includes(h)),
    ).toEqual([])
  })
})
