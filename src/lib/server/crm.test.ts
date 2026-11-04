import { describe, it, expect } from "vitest"
import { createTestDb } from "./db/test_db"
import { captureLead } from "./crm"

describe("captureLead", () => {
  it("creates one contact per email and appends an activity each time", async () => {
    const db = await createTestDb()
    const first = await captureLead(db, {
      email: "Lead@Example.com",
      name: "Lead",
      source: "contact",
      kind: "contact_form",
      body: "Hi",
    })
    const again = await captureLead(db, {
      email: "lead@example.com",
      company: "Acme",
      source: "chat",
      kind: "chat",
    })
    expect(first).toBe(again)
    const contacts = await db.selectFrom("crm_contacts").selectAll().execute()
    expect(contacts).toHaveLength(1)
    expect(contacts[0]).toMatchObject({
      email: "lead@example.com",
      name: "Lead",
      company: "Acme",
    })
    expect(
      await db.selectFrom("crm_activities").select("kind").execute(),
    ).toEqual([{ kind: "contact_form" }, { kind: "chat" }])
    expect(await captureLead(db, { source: "x", kind: "note" })).toBeNull()
  })
})
