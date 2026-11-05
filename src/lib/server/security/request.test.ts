import { describe, expect, it } from "vitest"
import type { RequestEvent } from "@sveltejs/kit"
import { clientIp, isSameOrigin } from "./request"

const event = (headers: Record<string, string>, address?: string) =>
  ({
    request: new Request("https://example.com/x", { headers }),
    url: new URL("https://example.com/x"),
    getClientAddress: () => {
      if (!address) throw new Error("address unavailable")
      return address
    },
  }) as unknown as RequestEvent

describe("clientIp", () => {
  it("uses the address the adapter resolved, not a header the client can set", () => {
    const e = event(
      {
        "cf-connecting-ip": "9.9.9.9",
        "x-real-ip": "8.8.8.8",
        "x-forwarded-for": "7.7.7.7, 6.6.6.6",
      },
      "203.0.113.5",
    )
    expect(clientIp(e)).toBe("203.0.113.5")
  })
  it("returns unknown when the adapter has no address", () => {
    expect(clientIp(event({ "x-forwarded-for": "7.7.7.7" }))).toBe("unknown")
  })
})

describe("isSameOrigin", () => {
  it("accepts a matching Origin header", () => {
    expect(isSameOrigin(event({ origin: "https://example.com" }))).toBe(true)
  })
  it("rejects a foreign Origin header", () => {
    expect(isSameOrigin(event({ origin: "https://evil.com" }))).toBe(false)
  })
  it("falls back to Sec-Fetch-Site when Origin is absent", () => {
    expect(isSameOrigin(event({ "sec-fetch-site": "same-origin" }))).toBe(true)
    expect(isSameOrigin(event({ "sec-fetch-site": "cross-site" }))).toBe(false)
    expect(isSameOrigin(event({}))).toBe(false)
  })
})
