import { describe, it, expect, beforeEach } from "vitest"
import { createTestDb } from "./db/test_db"
import { getSettings, invalidateSettings, saveSetting } from "./settings"
import { createUser } from "./auth/users"

beforeEach(() => invalidateSettings())

describe("settings", () => {
  it("reads defaults, then what was saved, and ignores a corrupt row", async () => {
    const db = await createTestDb()
    const r = await createUser(db, {
      email: "o@example.com",
      password: "pw-pw-pw",
    })
    const userId = (r as { user: { id: string } }).user.id
    expect((await getSettings(db)).general).toEqual({
      supportEmail: "",
      announcement: "",
    })
    await saveSetting(
      db,
      "general",
      { supportEmail: "help@example.com", announcement: "Hi" },
      userId,
    )
    expect((await getSettings(db)).general.supportEmail).toBe(
      "help@example.com",
    )
    await db
      .updateTable("site_settings")
      .set({ value: "{not json" })
      .where("key", "=", "general")
      .execute()
    invalidateSettings()
    expect((await getSettings(db)).general.supportEmail).toBe("")
  })
})
