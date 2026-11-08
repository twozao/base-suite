import { describe, it, expect, beforeEach } from "vitest"
import type { Db } from "../db"
import { createTestDb } from "../db/test_db"
import {
  checkPassword,
  consumeToken,
  createUser,
  deleteUser,
  issueToken,
  signInWithPassword,
  updateEmail,
  updatePassword,
} from "./users"
import {
  createSession,
  invalidateSession,
  invalidateUserSessions,
  validateSession,
} from "./session"

let db: Db
beforeEach(async () => {
  db = await createTestDb()
})

const signUp = (email: string, password = "correct horse") =>
  createUser(db, { email, password, claimOwner: true })

describe("accounts", () => {
  it("makes no one admin without an owner claim", async () => {
    const r = await createUser(db, {
      email: "x@example.com",
      password: "correct horse",
    })
    expect(r).toMatchObject({ ok: true, firstUser: false })
    expect(await db.selectFrom("user_roles").selectAll().execute()).toEqual([])
  })
  it("makes the first account the admin and later ones plain users", async () => {
    const first = await signUp("Owner@Example.com")
    const second = await signUp("second@example.com")
    expect(first).toMatchObject({ ok: true, firstUser: true })
    expect(second).toMatchObject({ ok: true, firstUser: false })
    const roles = await db.selectFrom("user_roles").selectAll().execute()
    expect(roles).toEqual([
      expect.objectContaining({
        user_id: (first as { user: { id: string } }).user.id,
        role: "admin",
      }),
    ])
    expect((first as { user: { email: string } }).user.email).toBe(
      "owner@example.com",
    )
    const profiles = await db.selectFrom("profiles").select("id").execute()
    expect(profiles).toHaveLength(2)
  })

  it("refuses a second account with the same email, in any case", async () => {
    await signUp("a@example.com")
    expect(await signUp("A@EXAMPLE.COM")).toEqual({
      ok: false,
      reason: "email_taken",
    })
  })

  it("signs in with the right password only", async () => {
    await signUp("a@example.com", "pw-one-two")
    expect(await signInWithPassword(db, "a@example.com", "wrong")).toBeNull()
    expect(
      await signInWithPassword(db, "nobody@example.com", "pw-one-two"),
    ).toBeNull()
    const user = await signInWithPassword(db, "A@example.com", "pw-one-two")
    expect(user?.email).toBe("a@example.com")
    const row = await db
      .selectFrom("users")
      .select("last_sign_in_at")
      .executeTakeFirstOrThrow()
    expect(row.last_sign_in_at).not.toBeNull()
  })

  it("changes the password and email", async () => {
    const r = await signUp("a@example.com", "old password")
    const id = (r as { user: { id: string } }).user.id
    await updatePassword(db, id, "new password")
    expect(await checkPassword(db, id, "old password")).toBe(false)
    expect(await checkPassword(db, id, "new password")).toBe(true)
    await signUp("taken@example.com")
    expect(await updateEmail(db, id, "taken@example.com")).toEqual({
      ok: false,
      reason: "email_taken",
    })
    expect(await updateEmail(db, id, "Fresh@example.com")).toEqual({ ok: true })
    expect(
      await signInWithPassword(db, "fresh@example.com", "new password"),
    ).not.toBeNull()
  })

  it("deleting an account removes its sessions, profile and roles", async () => {
    const r = await signUp("a@example.com")
    const id = (r as { user: { id: string } }).user.id
    const { token } = await createSession(db, id)
    await deleteUser(db, id)
    expect(await validateSession(db, token)).toBeNull()
    expect(await db.selectFrom("profiles").selectAll().execute()).toEqual([])
    expect(await db.selectFrom("user_roles").selectAll().execute()).toEqual([])
  })
})

describe("sessions", () => {
  it("resolves a token to its user until it is invalidated", async () => {
    const r = await signUp("a@example.com")
    const id = (r as { user: { id: string } }).user.id
    const { token } = await createSession(db, id)
    const found = await validateSession(db, token)
    expect(found?.user).toMatchObject({
      id,
      email: "a@example.com",
      emailVerified: false,
    })
    expect(await validateSession(db, token + "x")).toBeNull()
    await invalidateSession(db, found!.session.id)
    expect(await validateSession(db, token)).toBeNull()
  })

  it("drops expired sessions and extends ones past half life", async () => {
    const r = await signUp("a@example.com")
    const id = (r as { user: { id: string } }).user.id
    const { token } = await createSession(db, id)
    const soon = new Date(Date.now() + 60_000).toISOString()
    await db.updateTable("sessions").set({ expires_at: soon }).execute()
    const renewed = await validateSession(db, token)
    expect(renewed?.renewed).toBe(true)
    expect(Date.parse(renewed!.session.expiresAt)).toBeGreaterThan(
      Date.now() + 29 * 86_400_000,
    )
    await db
      .updateTable("sessions")
      .set({ expires_at: new Date(Date.now() - 1).toISOString() })
      .execute()
    expect(await validateSession(db, token)).toBeNull()
    expect(await db.selectFrom("sessions").selectAll().execute()).toEqual([])
  })

  it("signs out everywhere except the current session", async () => {
    const r = await signUp("a@example.com")
    const id = (r as { user: { id: string } }).user.id
    const keep = await createSession(db, id)
    const other = await createSession(db, id)
    const current = await validateSession(db, keep.token)
    await invalidateUserSessions(db, id, current!.session.id)
    expect(await validateSession(db, other.token)).toBeNull()
    expect(await validateSession(db, keep.token)).not.toBeNull()
  })
})

describe("one-time tokens", () => {
  it("redeems once, for the purpose it was issued for, before it expires", async () => {
    const r = await signUp("a@example.com")
    const id = (r as { user: { id: string } }).user.id
    const token = await issueToken(db, id, "reset_password")
    expect(await consumeToken(db, token, "verify_email")).toBeNull()
    expect(await consumeToken(db, token, "reset_password")).toBe(id)
    expect(await consumeToken(db, token, "reset_password")).toBeNull()
    const expired = await issueToken(db, id, "verify_email")
    await db
      .updateTable("auth_tokens")
      .set({ expires_at: new Date(Date.now() - 1).toISOString() })
      .execute()
    expect(await consumeToken(db, expired, "verify_email")).toBeNull()
  })

  it("issuing a new token replaces the previous one of the same purpose", async () => {
    const r = await signUp("a@example.com")
    const id = (r as { user: { id: string } }).user.id
    const old = await issueToken(db, id, "reset_password")
    const fresh = await issueToken(db, id, "reset_password")
    expect(await consumeToken(db, old, "reset_password")).toBeNull()
    expect(await consumeToken(db, fresh, "reset_password")).toBe(id)
  })
})
