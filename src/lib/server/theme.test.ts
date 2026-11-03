import { expect, it } from "vitest"
import { contentColor, themeCss } from "./theme"

it("picks readable text colours", () => {
  expect(contentColor("#4f46e5")).toBe("#ffffff")
  expect(contentColor("#f59e0b")).toBe("#0f172a")
})

it("refuses anything that isn't a hex colour", () => {
  expect(themeCss("red;}body{display:none", "#000000")).toBe("")
  expect(themeCss("#4f46e5", "#f59e0b")).toContain("--color-primary:#4f46e5")
})
