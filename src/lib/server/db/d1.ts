import {
  Kysely,
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
  type CompiledQuery,
  type DatabaseConnection,
  type Dialect,
  type Driver,
  type QueryResult,
} from "kysely"
import type { D1Database } from "@cloudflare/workers-types"
import type { Database } from "./schema"

// Kysely over Cloudflare D1. D1 has no interactive transactions, so a Kysely transaction here runs its
// statements one by one; code that must not race (booking) checks again after writing.
class D1Connection implements DatabaseConnection {
  constructor(private d1: D1Database) {}

  async executeQuery<R>(q: CompiledQuery): Promise<QueryResult<R>> {
    const params = q.parameters.map((p) =>
      p === undefined ? null : typeof p === "boolean" ? Number(p) : p,
    )
    const res = await this.d1
      .prepare(q.sql)
      .bind(...params)
      .all()
    const changes = res.meta.changes ?? 0
    return {
      rows: (res.results ?? []) as R[],
      numAffectedRows: changes > 0 ? BigInt(changes) : undefined,
      insertId:
        res.meta.last_row_id != null ? BigInt(res.meta.last_row_id) : undefined,
    }
  }

  // eslint-disable-next-line require-yield
  async *streamQuery<R>(): AsyncIterableIterator<QueryResult<R>> {
    throw new Error("D1 does not stream results")
  }
}

class D1Driver implements Driver {
  constructor(private d1: D1Database) {}
  async init() {}
  async acquireConnection() {
    return new D1Connection(this.d1)
  }
  async beginTransaction() {}
  async commitTransaction() {}
  async rollbackTransaction() {}
  async releaseConnection() {}
  async destroy() {}
}

const d1Dialect = (d1: D1Database): Dialect => ({
  createAdapter: () => new SqliteAdapter(),
  createDriver: () => new D1Driver(d1),
  createIntrospector: (db) => new SqliteIntrospector(db),
  createQueryCompiler: () => new SqliteQueryCompiler(),
})

export const openD1 = (d1: D1Database) =>
  new Kysely<Database>({ dialect: d1Dialect(d1) })
