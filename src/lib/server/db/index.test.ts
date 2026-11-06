import { mkdtempSync, existsSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, expect, it } from "vitest"
import { connect } from "./index"

const root = mkdtempSync(join(tmpdir(), "base-suite-db-"))
afterAll(() => rmSync(root, { recursive: true, force: true }))

it("creates the SQLite folder on a fresh clone", async () => {
  const file = join(root, "missing", "nested", "app.db")
  const { db } = await connect(file)
  expect(existsSync(file)).toBe(true)
  await db.destroy()
})
