import { describe, expect, it } from "vitest"
import {
  detectImageType,
  MEDIA_NAME_RE,
  safeBaseName,
  validateUpload,
} from "./media"

const png = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0,
])

describe("media uploads", () => {
  it("detects images by content", () => {
    expect(detectImageType(png)).toBe("image/png")
    expect(
      detectImageType(new TextEncoder().encode("<svg onload=alert(1)>")),
    ).toBeNull()
  })
  it("rejects disguised files", async () => {
    const fake = new File(["<script>alert(1)</script>"], "cat.png", {
      type: "image/png",
    })
    expect((await validateUpload(fake)).error).toMatch(/Only PNG/)
  })
  it("generates safe, unique names", async () => {
    const r = await validateUpload(
      new File([png], "../../My Logo!!.PNG", { type: "image/png" }),
    )
    expect(r.name).toMatch(MEDIA_NAME_RE)
    expect(safeBaseName("../../etc/passwd")).toBe("passwd")
    expect(safeBaseName("..\\..\\x.png")).toBe("x")
  })
})
