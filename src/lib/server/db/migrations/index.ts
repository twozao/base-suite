import type { Migration } from "kysely/migration"
import type { DialectName } from "../index"
import { initial } from "./0001_initial"

// Ordered by key. Each entry builds a dialect-aware Migration; add new ones at the end.
export const migrations: Record<string, (dialect: DialectName) => Migration> = {
  "0001_initial": initial,
}
