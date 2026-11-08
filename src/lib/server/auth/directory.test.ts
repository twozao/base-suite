import { describe, it, expect } from "vitest"
import { createTestDb } from "../db/test_db"
import { createUser } from "./users"
import { listUsers, findUserIdByEmail } from "./directory"

describe("listUsers", () => {
  it("searches email, name and company and reports roles and billing", async () => {
    const db = await createTestDb()
    const a = await createUser(db, {
      email: "ann@example.com",
      password: "pw-pw-pw",
      fullName: "Ann Lee",
      claimOwner: true,
    })
    await createUser(db, { email: "bob@example.com", password: "pw-pw-pw" })
    const annId = (a as { user: { id: string } }).user.id
    await db
      .updateTable("profiles")
      .set({ company_name: "Acme" })
      .where("id", "=", annId)
      .execute()
    await db
      .insertInto("subscriptions")
      .values({
        id: "sub_1",
        user_id: annId,
        stripe_customer_id: "cus_1",
        status: "active",
      })
      .execute()
    const all = await listUsers(db)
    expect(all.total).toBe(2)
    expect(all.users.map((u) => u.email)).toEqual([
      "bob@example.com",
      "ann@example.com",
    ])
    const ann = all.users.find((u) => u.email === "ann@example.com")!
    expect(ann).toMatchObject({
      roles: ["admin"],
      subscription_status: "active",
      full_name: "Ann Lee",
    })
    expect(
      (await listUsers(db, { search: "ACME" })).users.map((u) => u.email),
    ).toEqual(["ann@example.com"])
    expect((await listUsers(db, { search: "%" })).total).toBe(0)
    // Bob never verified his address, so it links nothing; Ann's does once verified.
    expect(await findUserIdByEmail(db, "BOB@example.com")).toBeNull()
    await db
      .updateTable("users")
      .set({ email_verified: 1 })
      .where("id", "=", annId)
      .execute()
    expect(await findUserIdByEmail(db, "ANN@example.com")).toBe(annId)
  })
})
