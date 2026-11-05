import { describe, it, expect } from "vitest"
import { createTestDb } from "../db/test_db"
import { rateLimit } from "./rate_limit"

describe("rateLimit", () => {
  it("allows max hits per window, then refuses until the window passes", async () => {
    const db = await createTestDb()
    const rule = { windowSeconds: 60, max: 3 }
    const t0 = Date.parse("2026-01-01T00:00:00Z")
    expect(await rateLimit(db, "k", rule, t0)).toBe(true)
    expect(await rateLimit(db, "k", rule, t0 + 1000)).toBe(true)
    expect(await rateLimit(db, "k", rule, t0 + 2000)).toBe(true)
    expect(await rateLimit(db, "k", rule, t0 + 3000)).toBe(false)
    expect(await rateLimit(db, "other", rule, t0 + 3000)).toBe(true)
    expect(await rateLimit(db, "k", rule, t0 + 61_000)).toBe(true)
  })
})
