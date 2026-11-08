import { describe, expect, it } from "vitest"
import { imageSize } from "./image_size"

describe("image size", () => {
  it("reads PNG and GIF headers", () => {
    const png = new Uint8Array(32)
    png.set([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48,
      0x44, 0x52, 0, 0, 3, 32, 0, 0, 1, 144,
    ])
    expect(imageSize(png)).toEqual({ width: 800, height: 400 })
    const gif = new Uint8Array(32)
    gif.set([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x40, 0x01, 0xf0, 0x00])
    expect(imageSize(gif)).toEqual({ width: 320, height: 240 })
    expect(imageSize(new Uint8Array(10))).toBeNull()
  })
})
