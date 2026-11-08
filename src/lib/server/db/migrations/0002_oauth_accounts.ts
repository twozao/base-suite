import { sql, type Kysely } from "kysely"
import type { Migration } from "kysely/migration"
import type { DialectName } from "../index"

// Links an external sign-in identity to a user. Subject is the provider's stable id, never the email.
export const oauthAccounts = (dialect: DialectName): Migration => {
  const now =
    dialect === "postgres"
      ? sql`to_char((now() at time zone 'utc'), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`
      : sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`
  return {
    async up(db: Kysely<unknown>) {
      await db.schema
        .createTable("oauth_accounts")
        .addColumn("provider", "text", (c) =>
          c.notNull().check(sql.raw("provider in ('google', 'github')")),
        )
        .addColumn("subject", "text", (c) =>
          c.notNull().check(sql.raw("length(subject) <= 255")),
        )
        .addColumn("user_id", "text", (c) =>
          c.notNull().references("users.id").onDelete("cascade"),
        )
        .addColumn("created_at", "text", (c) => c.notNull().defaultTo(now))
        .addPrimaryKeyConstraint("oauth_accounts_pk", ["provider", "subject"])
        .addUniqueConstraint("oauth_accounts_user_provider", [
          "user_id",
          "provider",
        ])
        .execute()
    },
    async down(db: Kysely<unknown>) {
      await db.schema.dropTable("oauth_accounts").ifExists().execute()
    },
  }
}
