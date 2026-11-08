import { describe, expect, it } from "vitest"
import { planHref, shouldAskForPlan } from "./pricing"
import { DEFAULT_PRICING, pricingSchema } from "./content_schema"

const base = DEFAULT_PRICING.plans[1]

describe("planHref", () => {
  it("sends free plans to sign up", () => {
    expect(planHref(DEFAULT_PRICING.plans[0], false)).toBe("/login/sign_up")
  })
  it("sends unconfigured paid plans to contact", () => {
    expect(planHref({ ...base, stripePriceId: "" }, true)).toBe("/contact_us")
  })
  it("checks out configured plans by plan id, never by raw price id", () => {
    expect(planHref({ ...base, stripePriceId: "price_abc123" }, true)).toBe(
      "/account/subscribe/pro",
    )
  })
})

describe("shouldAskForPlan", () => {
  const on = { subscriptionsOn: true, askAfterSignUp: true, isStaff: false }
  it("asks a customer only when the module and the setting are both on", () => {
    expect(shouldAskForPlan(on)).toBe(true)
    expect(shouldAskForPlan({ ...on, askAfterSignUp: false })).toBe(false)
    expect(shouldAskForPlan({ ...on, subscriptionsOn: false })).toBe(false)
  })
  it("never asks staff", () => {
    expect(shouldAskForPlan({ ...on, isStaff: true })).toBe(false)
  })
  it("defaults to off, including for plans saved before the option existed", () => {
    expect(DEFAULT_PRICING.askAfterSignUp).toBe(false)
    const older: Record<string, unknown> = { ...DEFAULT_PRICING }
    delete older.askAfterSignUp
    expect(pricingSchema.parse(older).askAfterSignUp).toBe(false)
  })
})
