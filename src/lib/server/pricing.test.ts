import { describe, expect, it } from "vitest"
import { planHref } from "./pricing"
import { DEFAULT_PRICING } from "./content_schema"

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
