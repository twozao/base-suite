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

const user = { id: "user123", email: "u@example.com" }

// Chainable Supabase stub: `single()` resolves `read`, awaiting any other chain resolves `write`.
const supabaseStub = (
  read: unknown = null,
  write: unknown = { error: null },
) => {
  type AuthResult = Promise<{ error: { message: string } | null }>
  const chain = {
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    single: vi.fn(async () => ({ data: read, error: null })),
    then: (resolve: (v: unknown) => void) => resolve(write),
    auth: {
      updateUser: vi.fn((): AuthResult => Promise.resolve({ error: null })),
      signInWithPassword: vi.fn(
        (): AuthResult => Promise.resolve({ error: null }),
      ),
      signOut: vi.fn((): AuthResult => Promise.resolve({ error: null })),
      admin: {
        deleteUser: vi.fn((): AuthResult => Promise.resolve({ error: null })),
      },
    },
  }
  for (const m of ["from", "select", "eq", "update", "upsert"] as const) {
    chain[m].mockImplementation(() => chain)
  }
  return chain
}

type Stub = ReturnType<typeof supabaseStub>

const event = (
  form: Record<string, string> | FormData,
  opts: {
    user?: typeof user | null
    supabase?: Stub
    amr?: { method: string; timestamp: number }[] | null
  } = {},
) => {
  const supabase = opts.supabase ?? supabaseStub()
  const u = opts.user === undefined ? user : opts.user
  return {
    request: new Request("https://site.test/account/api", {
      method: "POST",
      body: form instanceof FormData ? form : new URLSearchParams(form),
    }),
    url: new URL("https://site.test/account/api"),
    locals: {
      user: u,
      session: u ? { user: u } : null,
      supabase,
      supabaseServiceRole: supabase,
      safeGetSession: async () => ({
        session: u ? { user: u } : null,
        user: u,
        amr: opts.amr ?? null,
      }),
    },
  } as unknown as RequestEvent
}

const redirectTo = (location: string) => ({ status: 303, location })

beforeEach(() => vi.clearAllMocks())

describe("toggleEmailSubscription", () => {
  it("redirects to login without a user", async () => {
    await expect(
      actions.toggleEmailSubscription(event({}, { user: null })),
    ).rejects.toMatchObject(redirectTo("/login"))
  })
  it("flips the stored flag and returns the new value", async () => {
    const supabase = supabaseStub({ unsubscribed: false })
    const result = await actions.toggleEmailSubscription(
      event({}, { supabase }),
    )
    expect(supabase.update).toHaveBeenCalledWith({ unsubscribed: true })
    expect(supabase.eq).toHaveBeenCalledWith("id", "user123")
    expect(result).toEqual({ unsubscribed: true })
  })
  it("reports a failed write", async () => {
    const supabase = supabaseStub(
      { unsubscribed: true },
      { error: { message: "boom" } },
    )
    const result = await actions.toggleEmailSubscription(
      event({}, { supabase }),
    )
    expect(result).toMatchObject({ status: 500 })
  })
})

describe("updateEmail", () => {
  it("rejects a missing or malformed email with a field error", async () => {
    for (const email of ["", "not-an-email", "a@b"]) {
      const result = await actions.updateEmail(event({ email }))
      expect(result).toMatchObject({
        status: 400,
        data: { errorFields: ["email"] },
      })
    }
  })
  it("rejects a non-string value instead of crashing", async () => {
    const fd = new FormData()
    fd.append("email", new Blob(["x"]), "x.txt")
    const result = await actions.updateEmail(event(fd))
    expect(result).toMatchObject({ status: 400 })
  })
  it("asks Supabase to change the email", async () => {
    const supabase = supabaseStub()
    const result = await actions.updateEmail(
      event({ email: " New@Example.com " }, { supabase }),
    )
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({
      email: "New@Example.com",
    })
    expect(result).toEqual({ email: "New@Example.com" })
  })
})

describe("updatePassword", () => {
  const good = {
    newPassword1: "longenough",
    newPassword2: "longenough",
    currentPassword: "oldpass",
  }
  it("rejects mismatched, short or missing passwords", async () => {
    const mismatch = await actions.updatePassword(
      event({ ...good, newPassword2: "different" }),
    )
    expect(mismatch).toMatchObject({ status: 400 })
    expect(
      (mismatch as { data: { errorFields: string[] } }).data.errorFields,
    ).toContain("newPassword2")
    const short = await actions.updatePassword(
      event({ ...good, newPassword1: "abc", newPassword2: "abc" }),
    )
    expect(short).toMatchObject({
      status: 400,
      data: { errorFields: ["newPassword1"] },
    })
    const missing = await actions.updatePassword(
      event({ currentPassword: "x" }),
    )
    expect(missing).toMatchObject({ status: 400 })
  })
  it("needs the current password outside a recovery session", async () => {
    const supabase = supabaseStub()
    const result = await actions.updatePassword(
      event({ ...good, currentPassword: "" }, { supabase }),
    )
    expect(result).toMatchObject({
      status: 400,
      data: { errorFields: ["currentPassword"] },
    })
    expect(supabase.auth.updateUser).not.toHaveBeenCalled()
  })
  it("verifies the current password before changing it", async () => {
    const supabase = supabaseStub()
    const result = await actions.updatePassword(event(good, { supabase }))
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: user.email,
      password: "oldpass",
    })
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({
      password: "longenough",
    })
    expect(result).not.toMatchObject({ status: 400 })
  })
  it("sends a wrong current password to the explanation page", async () => {
    const supabase = supabaseStub()
    supabase.auth.signInWithPassword.mockResolvedValue({
      error: { message: "Invalid login" },
    })
    await expect(
      actions.updatePassword(event(good, { supabase })),
    ).rejects.toMatchObject(redirectTo("/login/current_password_error"))
    expect(supabase.auth.updateUser).not.toHaveBeenCalled()
  })
  it("lets a fresh recovery session set a password without the old one", async () => {
    const supabase = supabaseStub()
    const amr = [{ method: "recovery", timestamp: Date.now() / 1000 - 60 }]
    await actions.updatePassword(
      event({ ...good, currentPassword: "" }, { supabase, amr }),
    )
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled()
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({
      password: "longenough",
    })
  })
  it("refuses a recovery session older than 15 minutes", async () => {
    const supabase = supabaseStub()
    const amr = [{ method: "recovery", timestamp: Date.now() / 1000 - 16 * 60 }]
    const result = await actions.updatePassword(
      event({ ...good, currentPassword: "" }, { supabase, amr }),
    )
    expect(result).toMatchObject({ status: 400 })
    expect(supabase.auth.updateUser).not.toHaveBeenCalled()
  })
})

describe("deleteAccount", () => {
  it("requires the current password", async () => {
    const supabase = supabaseStub()
    const result = await actions.deleteAccount(event({}, { supabase }))
    expect(result).toMatchObject({
      status: 400,
      data: { errorFields: ["currentPassword"] },
    })
    expect(supabase.auth.admin.deleteUser).not.toHaveBeenCalled()
  })
  it("deletes the account after verifying the password, then signs out", async () => {
    const supabase = supabaseStub()
    await expect(
      actions.deleteAccount(
        event({ currentPassword: "oldpass" }, { supabase }),
      ),
    ).rejects.toMatchObject(redirectTo("/"))
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: user.email,
      password: "oldpass",
    })
    expect(supabase.auth.admin.deleteUser).toHaveBeenCalledWith("user123", true)
    expect(supabase.auth.signOut).toHaveBeenCalled()
  })
})

describe("updateProfile", () => {
  const good = {
    fullName: "Ann Example",
    companyName: "Acme",
    website: "https://acme.test",
  }
  it("rejects empty or oversized fields, echoing the values", async () => {
    const empty = await actions.updateProfile(event({ ...good, fullName: "" }))
    expect(empty).toMatchObject({
      status: 400,
      data: { errorFields: ["fullName"], companyName: "Acme" },
    })
    const long = await actions.updateProfile(
      event({ ...good, companyName: "x".repeat(51) }),
    )
    expect(long).toMatchObject({
      status: 400,
      data: { errorFields: ["companyName"] },
    })
  })
  it("saves the profile and welcomes a new user with links to this site", async () => {
    const supabase = supabaseStub({ updated_at: null, unsubscribed: false })
    const result = await actions.updateProfile(event(good, { supabase }))
    expect(supabase.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "user123",
        full_name: "Ann Example",
        company_name: "Acme",
        website: "https://acme.test",
      }),
    )
    expect(result).toEqual(good)
    expect(sendUserEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        template_name: "welcome_email",
        template_properties: {
          companyName: "Acme",
          WebsiteBaseUrl: "https://site.test",
        },
      }),
    )
  })
  it("does not welcome an existing profile again", async () => {
    const supabase = supabaseStub({ updated_at: "2026-01-01T00:00:00Z" })
    await actions.updateProfile(event(good, { supabase }))
    expect(sendUserEmail).not.toHaveBeenCalled()
  })
})
