import Database from "better-sqlite3"
import type { SqlDriver } from "../src/store/driver"

export const memoryDriver = (): SqlDriver => {
  const db = new Database(":memory:")
  return {
    all: async (sql, params = []) =>
      db.prepare(sql).all(...(params as never[])) as Record<string, unknown>[],
    run: async (sql, params = []) => {
      db.prepare(sql).run(...(params as never[]))
    },
  }
}

export const jsonResponse = (
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  })
