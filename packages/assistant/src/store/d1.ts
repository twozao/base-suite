import type { SqlDriver } from "./driver"

type D1Like = {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      all(): Promise<{ results: Record<string, unknown>[] }>
      run(): Promise<unknown>
    }
  }
}

export const d1Driver = (db: D1Like): SqlDriver => ({
  all: async (sql, params = []) =>
    (
      await db
        .prepare(sql)
        .bind(...params)
        .all()
    ).results,
  run: async (sql, params = []) => {
    await db
      .prepare(sql)
      .bind(...params)
      .run()
  },
})
