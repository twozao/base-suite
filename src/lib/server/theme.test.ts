import { expect, it } from "vitest"
import { contentColor, themeCss, THEMES, THEME_IDS } from "./theme"

it("picks readable text colours", () => {
  expect(contentColor("#4f46e5")).toBe("#ffffff")
  expect(contentColor("#f59e0b")).toBe("#0f172a")
})

it("refuses anything that isn't a hex colour", () => {
  expect(themeCss("red;}body{display:none", "#000000")).toBe("")
  expect(themeCss("#4f46e5", "#f59e0b")).toContain("--color-primary:#4f46e5")
})

it("emits every preset's base colours, radius and fonts", () => {
  for (const id of THEME_IDS) {
    const css = themeCss("#4f46e5", "#f59e0b", id)
    expect(css).toContain(`--color-base-100:${THEMES[id].base100}`)
    expect(css).toContain(`--radius-box:${THEMES[id].radiusBox}`)
    expect(css).toContain(`--bs-font-heading:${THEMES[id].fontHeading}`)
    expect(css).toContain(`color-scheme:${THEMES[id].colorScheme}`)
  }
})
