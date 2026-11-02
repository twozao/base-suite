import { expect, it } from "vitest"
import { isUuid } from "./ids"

it("accepts any Postgres uuid and rejects junk", () => {
  expect(isUuid("00000000-0000-0000-0000-00000000000b")).toBe(true)
  expect(isUuid("3f2b8c1e-9a4d-4c2e-8f1a-2b3c4d5e6f70")).toBe(true)
  expect(isUuid("not-a-uuid")).toBe(false)
  expect(isUuid("3f2b8c1e-9a4d-4c2e-8f1a-2b3c4d5e6f70' or 1=1")).toBe(false)
})
