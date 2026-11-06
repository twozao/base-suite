import { mkdirSync } from "node:fs"
import { dirname } from "node:path"
import SqliteDatabase from "better-sqlite3"
import { Migrator, type Migration } from "kysely/migration"
import { Kysely, PostgresDialect, SqliteDialect } from "kysely"
import pg from "pg"
import type { Database } from "./schema"
import { migrations } from "./migrations"

export type Db = Kysely<Database>
export type DialectName = "sqlite" | "postgres"

export const DEFAULT_SQLITE_PATH = "data/base-suite.db"

// DATABASE_URL picks the engine: empty or a file path means SQLite (the default), postgres://
// means Postgres. ":memory:" is for tests.
export const dialectFor = (url: string): DialectName =>
  /^postgres(ql)?:/.test(url) ? "postgres" : "sqlite"

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
  const path = sqlitePath(url)
  // A fresh clone has no data/ folder yet; create it so `npm run dev` works without setup.sh.
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true })
  const database = new SqliteDatabase(path)
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

/** Applies every migration not yet applied. Safe to run on every start. */
export const migrateToLatest = async (db: Db, dialect: DialectName) => {
  const migrator = new Migrator({
    db,
    provider: {
      getMigrations: async () =>
        Object.fromEntries(
          Object.entries(migrations).map(([name, make]) => [
            name,
            make(dialect),
          ]),
        ) as Record<string, Migration>,
    },
  })
  const { error, results } = await migrator.migrateToLatest()
  if (error) throw error instanceof Error ? error : new Error(String(error))
  return (results ?? [])
    .filter((r) => r.status === "Success")
    .map((r) => r.migrationName)
}

/** Opens the database and brings it up to date. The app calls this once at start. */
export const connect = async (url: string) => {
  const opened = openDb(url)
  await migrateToLatest(opened.db, opened.dialect)
  return opened
}
