import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Db } from "../db"
import { createTestDb } from "../db/test_db"
import { createUser } from "./users"
import {
  base32Decode,
  base32Encode,
  beginTotpSetup,
  checkTotp,
  enableTotp,
  newRecoveryCodes,
  totpAt,
  useRecoveryCode,
  verifyTotp,
} from "./two_factor"

vi.mock("$env/dynamic/private", () => ({
  env: { PRIVATE_SECRETS_KEY: "test-key-material" },
}))

let db: Db
let userId: string
beforeEach(async () => {
  db = await createTestDb()
  const r = await createUser(db, {
    email: "a@example.com",
    password: "a-long-password-1",
  })
  if (!r.ok) throw new Error("user")
  userId = r.user.id
})

describe("two-step sign-in", () => {
  it("matches the RFC 6238 test vector", async () => {
    const secret = new TextEncoder().encode("12345678901234567890")
    expect(await totpAt(secret, 1)).toBe("287082")
    expect(base32Decode(base32Encode(secret))).toEqual(secret)
    expect(await verifyTotp(secret, "287082", 59_000)).toBe(1)
    expect(await verifyTotp(secret, "000000", 59_000)).toBeNull()
  })
  it("accepts a code once and only after setup is confirmed", async () => {
    const b32 = await beginTotpSetup(db, userId)
    const code = await totpAt(
      base32Decode(b32),
      Math.floor(Date.now() / 30_000),
    )
    expect(await checkTotp(db, userId, code)).toBe(false)
    expect(await checkTotp(db, userId, code, false)).toBe(true)
    await enableTotp(db, userId)
    expect(await checkTotp(db, userId, code)).toBe(false)
  })
  it("recovery codes work once each", async () => {
    const codes = await newRecoveryCodes(db, userId)
    expect(codes).toHaveLength(10)
    expect(await useRecoveryCode(db, userId, codes[0])).toBe(true)
    expect(await useRecoveryCode(db, userId, codes[0])).toBe(false)
    expect(await useRecoveryCode(db, userId, "nope-nope")).toBe(false)
  })
})
