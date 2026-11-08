import SqliteDatabase from "better-sqlite3"
import { Kysely, PostgresDialect, SqliteDialect } from "kysely"
import pg from "pg"
import type { Database } from "./schema"
import {
  DEFAULT_SQLITE_PATH,
  dialectFor,
  type Db,
  type DialectName,
} from "./index"

// Node drivers. Kept apart from index.ts so a Cloudflare build never loads native modules.
const sqlitePath = (url: string) => {
  const path = url.replace(/^(sqlite:|file:)/, "")
  return path === "" ? DEFAULT_SQLITE_PATH : path
}

// Postgres hands back int8 as strings and timestamps as Date objects; the schema wants numbers and
// ISO strings everywhere, so both are parsed here once.
pg.types.setTypeParser(20, (v) => Number(v))
pg.types.setTypeParser(1184, (v) => new Date(v).toISOString())
pg.types.setTypeParser(1114, (v) => new Date(v + "Z").toISOString())

export const openDb = (url: string): { db: Db; dialect: DialectName } => {
  const dialect = dialectFor(url)
  if (dialect === "postgres") {
    const pool = new pg.Pool({ connectionString: url })
    return {
      db: new Kysely<Database>({ dialect: new PostgresDialect({ pool }) }),
      dialect,
    }
  }
  const database = new SqliteDatabase(sqlitePath(url))
  database.pragma("foreign_keys = ON")
  database.pragma("busy_timeout = 5000")
  if (database.memory === false) {
    database.pragma("journal_mode = WAL")
    database.pragma("synchronous = NORMAL")
  }
  return {
    db: new Kysely<Database>({ dialect: new SqliteDialect({ database }) }),
    dialect,
  }
}
