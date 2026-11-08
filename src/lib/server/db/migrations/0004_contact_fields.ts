import { sql, type Kysely } from "kysely"
import type { Migration } from "kysely/migration"

// What a contact message is about, how to reply, and which page sent it.
export const contactFields = (): Migration => ({
  async up(db: Kysely<unknown>) {
    for (const [col, max] of [
      ["topic", 120],
      ["preferred_contact", 20],
      ["source_path", 300],
    ] as const) {
      await db.schema
        .alterTable("contact_requests")
        .addColumn(col, "text", (c) =>
          c.check(sql.raw(`length(${col}) <= ${max}`)),
        )
        .execute()
    }
  },
  async down(db: Kysely<unknown>) {
    for (const col of ["topic", "preferred_contact", "source_path"]) {
      await db.schema.alterTable("contact_requests").dropColumn(col).execute()
    }
  },
})
