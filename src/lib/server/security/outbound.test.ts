import { describe, expect, it } from "vitest"
import { isPrivateAddress, publicHttpsUrl } from "./outbound"

describe("outside addresses", () => {
  it("spots private and local addresses", () => {
    for (const ip of [
      "127.0.0.1",
      "10.1.2.3",
      "192.168.0.1",
      "172.16.5.5",
      "169.254.169.254",
      "::1",
      "fd00::1",
      "::ffff:10.0.0.1",
      "100.64.0.1",
    ])
      expect(isPrivateAddress(ip), ip).toBe(true)
    for (const ip of ["8.8.8.8", "2606:4700::1111", "1.1.1.1"])
      expect(isPrivateAddress(ip), ip).toBe(false)
  })
  it("allows only public https", () => {
    expect(publicHttpsUrl("https://example.com/a.png")).toBeInstanceOf(URL)
    for (const u of [
      "http://example.com",
      "https://localhost/x",
      "https://127.0.0.1/",
      "https://[::1]/",
      "https://user:pw@example.com/",
      "https://example.com:8443/",
      "https://intranet/",
      "file:///etc/passwd",
    ])
      expect(typeof publicHttpsUrl(u), u).toBe("string")
  })
})
