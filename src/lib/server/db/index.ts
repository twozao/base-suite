import { Migrator, type Migration } from "kysely/migration"
import { sql, type Kysely } from "kysely"
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

// D1 in production refuses the schema queries Kysely's Migrator runs, so D1 gets its own runner over the
// same migrations and the same kysely_migration table. A lock row stops two Workers applying one twice.
const LOCK_MS = 60_000

export const migrateD1 = async (db: Db) => {
  await sql`create table if not exists kysely_migration (name varchar(255) not null primary key, timestamp varchar(255) not null)`.execute(
    db,
  )
  await sql`create table if not exists bs_migration_lock (id integer primary key, until text not null)`.execute(
    db,
  )
  const pending = async () => {
    const done = new Set(
      (
        await sql<{ name: string }>`select name from kysely_migration`.execute(
          db,
        )
      ).rows.map((r) => r.name),
    )
    return Object.keys(migrations)
      .sort()
      .filter((m) => !done.has(m))
  }
  if (!(await pending()).length) return []
  for (let tries = 0; tries < 40; tries++) {
    const now = new Date()
    const got =
      await sql`insert into bs_migration_lock (id, until) values (1, ${new Date(now.getTime() + LOCK_MS).toISOString()})
      on conflict (id) do update set until = excluded.until where bs_migration_lock.until < ${now.toISOString()}`.execute(
        db,
      )
    if (Number(got.numAffectedRows ?? 0) > 0) {
      try {
        const applied: string[] = []
        for (const name of await pending()) {
          await migrations[name]("sqlite").up(db as unknown as Kysely<unknown>)
          await sql`insert into kysely_migration (name, timestamp) values (${name}, ${new Date().toISOString()})`.execute(
            db,
          )
          applied.push(name)
        }
        return applied
      } finally {
        await sql`delete from bs_migration_lock where id = 1`.execute(db)
      }
    }
    // Another Worker is migrating: wait for it, then check what is left.
    await new Promise((r) => setTimeout(r, 250))
    if (!(await pending()).length) return []
  }
  throw new Error(
    "Timed out waiting for another instance to migrate the database",
  )
}

let d1: { binding: D1Database; db: Promise<Db> } | null = null

/** The D1 database, migrated once per Worker instance. */
export const connectD1 = (binding: D1Database): Promise<Db> => {
  if (d1?.binding !== binding) {
    const db = openD1(binding)
    const ready = migrateD1(db).then(() => db)
    // A failed migration is retried on the next request instead of being cached.
    ready.catch(() => {
      if (d1?.binding === binding) d1 = null
    })
    d1 = { binding, db: ready }
  }
  return d1.db
}
