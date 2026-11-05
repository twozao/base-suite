import { sql } from "kysely"
import { openDb, migrateToLatest, type Db } from "./index"

// A fresh, migrated database for a test: in-memory SQLite, or the throwaway Postgres database in
// TEST_DATABASE_URL (its public schema is dropped first, so never point it at real data).
export const createTestDb = async (): Promise<Db> => {
  const url = process.env.TEST_DATABASE_URL ?? ":memory:"
  const { db, dialect } = openDb(url)
  if (dialect === "postgres") {
    await sql`drop schema public cascade`.execute(db)
    await sql`create schema public`.execute(db)
  }
  await migrateToLatest(db, dialect)
  return db
}
