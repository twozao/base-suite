import { describe, it, expect } from "vitest"
import { createTestDb } from "$lib/server/db/test_db"
import { recordPageView } from "./record.server"

describe("recordPageView", () => {
  it("creates the counters on first hit and increments them after", async () => {
    const db = await createTestDb()
    await recordPageView(db, "/", "news.example.com", "2026-01-01")
    await recordPageView(db, "/", "news.example.com", "2026-01-01")
    await recordPageView(db, "/pricing", null, "2026-01-01")
    await recordPageView(db, "/", null, "2026-01-02")

    const daily = await db
      .selectFrom("analytics_daily")
      .selectAll()
      .orderBy("day")
      .orderBy("path")
      .execute()
    expect(daily).toEqual([
      { day: "2026-01-01", path: "/", views: 2 },
      { day: "2026-01-01", path: "/pricing", views: 1 },
      { day: "2026-01-02", path: "/", views: 1 },
    ])
    const refs = await db
      .selectFrom("analytics_referrers")
      .selectAll()
      .execute()
    expect(refs).toEqual([
      { day: "2026-01-01", host: "news.example.com", views: 2 },
    ])
  })
})
