import { sql, type RawBuilder } from "kysely"

/** Case-insensitive "contains" that works on SQLite and Postgres (lower + LIKE with escaped wildcards). */
export const likeTerm = (q: string) =>
  "%" + q.toLowerCase().replace(/[\\%_]/g, (c) => "\\" + c) + "%"

export const containsText = (column: string, q: string): RawBuilder<boolean> =>
  sql<boolean>`lower(${sql.ref(column)}) like ${likeTerm(q)} escape '\\'`
