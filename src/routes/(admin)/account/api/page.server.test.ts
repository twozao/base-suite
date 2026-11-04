import { describe, it, expect, vi, beforeEach } from "vitest"
import type { RequestEvent } from "./$types"

vi.mock("$env/dynamic/private", () => ({ env: {} }))
vi.mock("$lib/mailer", () => ({
  sendAdminEmail: vi.fn(),
  sendUserEmail: vi.fn(),
}))
vi.mock("$lib/server/settings", () => ({
  getSettings: vi.fn().mockResolvedValue({ brand: { siteName: "Acme" } }),
}))

import { actions } from "./+page.server"
import { sendUserEmail } from "$lib/mailer"
import { createTestDb } from "$lib/server/db/test_db"
import type { Db } from "$lib/server/db"
import { checkPassword, createUser } from "$lib/server/auth/users"
import { createSession, validateSession } from "$lib/server/auth/session"
import type { SessionUser } from "$lib/server/auth/session"

const PASSWORD = "correct horse battery"
let db: Db
let user: SessionUser
let sessionId: string

beforeEach(async () => {
  db = await createTestDb()
  const created = await createUser(db, {
    email: "u@example.com",
    password: PASSWORD,
  })
  user = (created as { user: SessionUser }).user
  const { token } = await createSession(db, user.id)
  sessionId = (await validateSession(db, token))!.session.id
})

const cookies = { delete: vi.fn(), set: vi.fn(), get: vi.fn() }

const event = (form: Record<string, string>, signedIn = true) => {
  const body = new FormData()
  for (const [k, v] of Object.entries(form)) body.append(k, v)
  return {
    request: new Request("http://localhost/account/api", {
      method: "POST",
      body,
    }),
    locals: {
      db,
      user: signedIn ? user : null,
      session: signedIn ? { id: sessionId, expiresAt: "" } : null,
    },
    url: new URL("http://localhost/account/api"),
    cookies,
  } as unknown as RequestEvent
}

type Failure = { status: number; data: Record<string, unknown> }
const run = async (
  action: keyof typeof actions,
  form: Record<string, string>,
  signedIn = true,
) =>
  (await actions[action](event(form, signedIn))) as
    | Failure
    | Record<string, unknown>

describe("account actions", () => {
  it("redirect to login when signed out", async () => {
    await expect(run("updateProfile", {}, false)).rejects.toMatchObject({
      status: 303,
    })
  })

  it("updateProfile validates every field, saves, and welcomes only the first time", async () => {
    const bad = (await run("updateProfile", {
      fullName: "",
      companyName: "Acme",
      website: "",
    })) as Failure
    expect(bad.status).toBe(400)
    expect(bad.data.errorFields).toEqual(["fullName", "website"])
    expect(bad.data.companyName).toBe("Acme")

    const ok = await run("updateProfile", {
      fullName: "Ann",
      companyName: "Acme",
      website: "acme.test",
    })
    expect(ok).toEqual({
      fullName: "Ann",
      companyName: "Acme",
      website: "acme.test",
    })
    expect(sendUserEmail).toHaveBeenCalledTimes(1)
    expect(vi.mocked(sendUserEmail).mock.calls[0][0]).toMatchObject({
      userId: user.id,
      template_name: "welcome_email",
    })
    const row = await db
      .selectFrom("profiles")
      .selectAll()
      .where("id", "=", user.id)
      .executeTakeFirstOrThrow()
    expect(row).toMatchObject({
      full_name: "Ann",
      company_name: "Acme",
      website: "acme.test",
    })
    expect(row.updated_at).not.toBeNull()

    await run("updateProfile", {
      fullName: "Ann B",
      companyName: "Acme",
      website: "acme.test",
    })
    expect(sendUserEmail).toHaveBeenCalledTimes(1)
  })

  it("updatePassword needs the current password and signs out other sessions", async () => {
    const other = await createSession(db, user.id)
    const wrong = (await run("updatePassword", {
      newPassword1: "a new password",
      newPassword2: "a new password",
      currentPassword: "nope",
    })) as Failure
    expect(wrong.status).toBe(400)
    expect(wrong.data.errorFields).toEqual(["currentPassword"])
    const mismatch = (await run("updatePassword", {
      newPassword1: "a new password",
      newPassword2: "another",
      currentPassword: PASSWORD,
    })) as Failure
    expect(mismatch.data.errorFields).toEqual(["newPassword2"])
    const short = (await run("updatePassword", {
      newPassword1: "short",
      newPassword2: "short",
      currentPassword: PASSWORD,
    })) as Failure
    expect(short.data.errorFields).toEqual(["newPassword1"])
    expect(short.data.newPassword1).toBeUndefined()

    expect(
      await run("updatePassword", {
        newPassword1: "a new password",
        newPassword2: "a new password",
        currentPassword: PASSWORD,
      }),
    ).toEqual({})
    expect(await checkPassword(db, user.id, "a new password")).toBe(true)
    expect(await validateSession(db, other.token)).toBeNull()
    expect(await db.selectFrom("sessions").select("id").execute()).toEqual([
      { id: sessionId },
    ])
  })

  it("updateEmail checks the password, rejects a taken address and lowercases the new one", async () => {
    await createUser(db, { email: "taken@example.com", password: PASSWORD })
    const wrong = (await run("updateEmail", {
      email: "New@Example.com",
      currentPassword: "nope",
    })) as Failure
    expect(wrong.data.errorFields).toEqual(["currentPassword"])
    const taken = (await run("updateEmail", {
      email: "taken@example.com",
      currentPassword: PASSWORD,
    })) as Failure
    expect(taken.status).toBe(400)
    expect(taken.data.errorFields).toEqual(["email"])
    expect(
      await run("updateEmail", {
        email: "New@Example.com",
        currentPassword: PASSWORD,
      }),
    ).toEqual({
      email: "New@Example.com",
    })
    const row = await db
      .selectFrom("users")
      .select(["email", "email_verified"])
      .where("id", "=", user.id)
      .executeTakeFirstOrThrow()
    expect(row).toEqual({ email: "new@example.com", email_verified: 0 })
  })

  it("toggleEmailSubscription flips the flag", async () => {
    expect(await run("toggleEmailSubscription", {})).toEqual({
      unsubscribed: true,
    })
    expect(await run("toggleEmailSubscription", {})).toEqual({
      unsubscribed: false,
    })
  })

  it("deleteAccount needs the password, then removes the user and the cookie", async () => {
    const wrong = (await run("deleteAccount", {
      currentPassword: "nope",
    })) as Failure
    expect(wrong.status).toBe(400)
    await expect(
      run("deleteAccount", { currentPassword: PASSWORD }),
    ).rejects.toMatchObject({ status: 303, location: "/" })
    expect(await db.selectFrom("users").select("id").execute()).toEqual([])
    expect(cookies.delete).toHaveBeenCalledWith("session", { path: "/" })
  })
})
