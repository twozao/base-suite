import { describe, expect, it } from "vitest"
import { sql } from "kysely"
import { migrateD1 } from "./index"
import { migrations } from "./migrations"
import { openDb } from "./node"

describe("D1 migration runner", () => {
  it("applies every migration once, without schema queries, and records them", async () => {
    const { db } = openDb(":memory:")
    expect(await migrateD1(db)).toEqual(Object.keys(migrations).sort())
    expect(await migrateD1(db)).toEqual([])
    const rows = await sql<{
      name: string
    }>`select name from kysely_migration`.execute(db)
    expect(rows.rows).toHaveLength(Object.keys(migrations).length)
    const lock = await sql<{
      n: number
    }>`select count(*) as n from bs_migration_lock`.execute(db)
    expect(Number(lock.rows[0].n)).toBe(0)
  })
})
