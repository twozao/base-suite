// The only thing the module needs from a database. SQL uses ? placeholders and portable types;
// a Postgres driver converts them. Base Suite wraps Kysely, the Worker wraps D1.
export type SqlRow = Record<string, unknown>
export interface SqlDriver {
  all(sql: string, params?: unknown[]): Promise<SqlRow[]>
  run(sql: string, params?: unknown[]): Promise<void>
}
