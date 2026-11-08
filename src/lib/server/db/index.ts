import { Migrator, type Migration } from "kysely/migration"
import type { Kysely } from "kysely"
import type { D1Database } from "@cloudflare/workers-types"
import type { Database } from "./schema"
import { migrations } from "./migrations"
import { openD1 } from "./d1"

export type Db = Kysely<Database>
export type DialectName = "sqlite" | "postgres"

export const DEFAULT_SQLITE_PATH = "data/base-suite.db"

// DATABASE_URL picks the engine: empty or a file path means SQLite (the default), postgres://
// means Postgres. ":memory:" is for tests. On Cloudflare the D1 binding is used instead.
export const dialectFor = (url: string): DialectName =>
  /^postgres(ql)?:/.test(url) ? "postgres" : "sqlite"

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

/** Opens the database and brings it up to date. The app calls this once at start on Node. */
export const connect = async (url: string) => {
  // Loaded only on Node, so the Cloudflare build never bundles the native SQLite driver.
  const { openDb } = await import("./node")
  const opened = openDb(url)
  await migrateToLatest(opened.db, opened.dialect)
  return opened
}

let d1: { binding: D1Database; db: Promise<Db> } | null = null

/** The D1 database, migrated once per Worker instance. */
export const connectD1 = (binding: D1Database): Promise<Db> => {
  if (d1?.binding !== binding) {
    const db = openD1(binding)
    const ready = migrateToLatest(db, "sqlite").then(() => db)
    // A failed migration is retried on the next request instead of being cached.
    ready.catch(() => {
      if (d1?.binding === binding) d1 = null
    })
    d1 = { binding, db: ready }
  }
  return d1.db
}
