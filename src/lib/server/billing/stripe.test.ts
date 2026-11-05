import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("$env/dynamic/private", () => ({ env: {} as Record<string, string> }))

import { env } from "$env/dynamic/private"
import { stripeClient } from "./stripe"

describe("stripeClient", () => {
  beforeEach(() => {
    env.PRIVATE_STRIPE_API_KEY = ""
  })
  it("is null until a key is configured", () => {
    expect(stripeClient()).toBeNull()
  })
  it("returns a working client once the key is set", () => {
    env.PRIVATE_STRIPE_API_KEY = "sk_test_123"
    const stripe = stripeClient()
    expect(stripe).not.toBeNull()
    expect(typeof stripe?.checkout.sessions.create).toBe("function")
    expect(stripeClient()).toBe(stripe)
  })
})
