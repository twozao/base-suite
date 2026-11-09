import { sql, type ColumnDefinitionBuilder, type Kysely } from "kysely"
import type { Migration } from "kysely/migration"
import type { DialectName } from "../index"

// Email templates editable in the admin (overriding the built-in files or added by extensions) and a log of every send.
export const email = (dialect: DialectName): Migration => {
  const now =
    dialect === "postgres"
      ? sql`to_char((now() at time zone 'utc'), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`
      : sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`
  const maxLen = (col: string, n: number) => sql.raw(`length(${col}) <= ${n}`)
  const oneOf = (col: string, values: string[]) =>
    sql.raw(`${col} in (${values.map((v) => `'${v}'`).join(", ")})`)
  const serial = (c: ColumnDefinitionBuilder) =>
    dialect === "postgres"
      ? c.primaryKey().generatedByDefaultAsIdentity()
      : c.primaryKey().autoIncrement()
  const intId = dialect === "postgres" ? "bigint" : "integer"
  const created = (c: ColumnDefinitionBuilder) => c.notNull().defaultTo(now)

  return {
    async up(db: Kysely<unknown>) {
      await db.schema
        .createTable("email_templates")
        .addColumn("id", "text", (c) => c.primaryKey())
        .addColumn("slug", "text", (c) =>
          c.notNull().unique().check(maxLen("slug", 60)),
        )
        .addColumn("name", "text", (c) =>
          c.notNull().check(maxLen("name", 120)),
        )
        .addColumn("description", "text", (c) =>
          c.check(maxLen("description", 500)),
        )
        .addColumn("subject", "text", (c) =>
          c.notNull().check(maxLen("subject", 300)),
        )
        .addColumn("html", "text", (c) => c.check(maxLen("html", 100000)))
        .addColumn("text", "text", (c) => c.check(maxLen("text", 20000)))
        .addColumn("variables_json", "text", (c) => c.notNull().defaultTo("[]"))
        .addColumn("extension_id", "text")
        .addColumn("updated_by", "text")
        .addColumn("created_at", "text", created)
        .addColumn("updated_at", "text", created)
        .execute()

      await db.schema
        .createTable("email_log")
        .addColumn("id", intId, serial)
        .addColumn("template", "text")
        .addColumn("to_email", "text", (c) =>
          c.notNull().check(maxLen("to_email", 1000)),
        )
        .addColumn("subject", "text", (c) =>
          c.notNull().check(maxLen("subject", 300)),
        )
        .addColumn("status", "text", (c) =>
          c.notNull().check(oneOf("status", ["sent", "failed", "skipped"])),
        )
        .addColumn("source", "text", (c) =>
          c
            .notNull()
            .defaultTo("system")
            .check(oneOf("source", ["system", "admin", "test"])),
        )
        .addColumn("provider_id", "text")
        .addColumn("error", "text", (c) => c.check(maxLen("error", 500)))
        .addColumn("body_text", "text", (c) =>
          c.check(maxLen("body_text", 20000)),
        )
        .addColumn("sent_by", "text")
        .addColumn("created_at", "text", created)
        .execute()
      await db.schema
        .createIndex("email_log_created_idx")
        .on("email_log")
        .column("created_at")
        .execute()
    },
    async down(db: Kysely<unknown>) {
      await db.schema.dropTable("email_log").execute()
      await db.schema.dropTable("email_templates").execute()
    },
  }
}
