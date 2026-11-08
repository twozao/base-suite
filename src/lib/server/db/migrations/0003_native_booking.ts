import { sql, type Kysely } from "kysely"
import type { Migration } from "kysely/migration"
import type { DialectName } from "../index"

// Native scheduling. The bookings table is rebuilt because SQLite cannot change a check constraint,
// and rows are copied across, so existing Calendly bookings are kept.
export const nativeBooking = (dialect: DialectName): Migration => {
  const now =
    dialect === "postgres"
      ? sql`to_char((now() at time zone 'utc'), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`
      : sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`
  const maxLen = (col: string, n: number) => sql.raw(`length(${col}) <= ${n}`)
  const shared = [
    "id",
    "external_id",
    "event_uri",
    "event_name",
    "invitee_name",
    "invitee_email",
    "user_id",
    "start_time",
    "end_time",
    "status",
    "cancel_reason",
    "cancel_url",
    "reschedule_url",
    "created_at",
    "updated_at",
  ].join(", ")

  return {
    async up(db: Kysely<unknown>) {
      await db.schema
        .createTable("booking_event_types")
        .addColumn("id", "text", (c) => c.primaryKey())
        .addColumn("slug", "text", (c) =>
          c.notNull().unique().check(maxLen("slug", 80)),
        )
        .addColumn("name", "text", (c) =>
          c.notNull().check(maxLen("name", 120)),
        )
        .addColumn("description", "text", (c) =>
          c.notNull().defaultTo("").check(maxLen("description", 1000)),
        )
        .addColumn("duration_minutes", "integer", (c) => c.notNull())
        .addColumn("location_kind", "text", (c) =>
          c
            .notNull()
            .defaultTo("video")
            .check(
              sql.raw(
                "location_kind in ('video', 'phone', 'in_person', 'custom')",
              ),
            ),
        )
        .addColumn("location_detail", "text", (c) =>
          c.notNull().defaultTo("").check(maxLen("location_detail", 500)),
        )
        .addColumn("buffer_before", "integer", (c) => c.notNull().defaultTo(0))
        .addColumn("buffer_after", "integer", (c) => c.notNull().defaultTo(0))
        .addColumn("min_notice_minutes", "integer", (c) =>
          c.notNull().defaultTo(240),
        )
        .addColumn("max_days_ahead", "integer", (c) =>
          c.notNull().defaultTo(60),
        )
        .addColumn("slot_interval", "integer", (c) => c.notNull().defaultTo(30))
        .addColumn("daily_limit", "integer")
        .addColumn("questions", "text", (c) => c.notNull().defaultTo("[]"))
        .addColumn("active", "integer", (c) => c.notNull().defaultTo(1))
        .addColumn("sort_order", "integer", (c) => c.notNull().defaultTo(0))
        .addColumn("created_at", "text", (c) => c.notNull().defaultTo(now))
        .addColumn("updated_at", "text", (c) => c.notNull().defaultTo(now))
        .execute()

      // A single row every booking write locks, so two visitors cannot take one slot.
      await db.schema
        .createTable("booking_lock")
        .addColumn("id", "integer", (c) => c.primaryKey())
        .addColumn("touched_at", "text")
        .execute()
      await sql`insert into booking_lock (id) values (1)`.execute(db)

      await db.schema
        .createTable("bookings_new")
        .addColumn("id", "text", (c) => c.primaryKey())
        .addColumn("provider", "text", (c) =>
          c
            .notNull()
            .defaultTo("calendly")
            .check(sql.raw("provider in ('calendly', 'native')")),
        )
        .addColumn("external_id", "text", (c) =>
          c.notNull().unique().check(maxLen("external_id", 500)),
        )
        .addColumn("event_uri", "text", (c) =>
          c.check(maxLen("event_uri", 500)),
        )
        .addColumn("event_name", "text", (c) =>
          c.check(maxLen("event_name", 300)),
        )
        .addColumn("invitee_name", "text", (c) =>
          c.check(maxLen("invitee_name", 300)),
        )
        .addColumn("invitee_email", "text", (c) =>
          c.check(maxLen("invitee_email", 320)),
        )
        .addColumn("user_id", "text", (c) =>
          c.references("users.id").onDelete("set null"),
        )
        .addColumn("start_time", "text")
        .addColumn("end_time", "text")
        .addColumn("status", "text", (c) =>
          c
            .notNull()
            .defaultTo("scheduled")
            .check(sql.raw("status in ('scheduled', 'canceled', 'no_show')")),
        )
        .addColumn("cancel_reason", "text", (c) =>
          c.check(maxLen("cancel_reason", 2000)),
        )
        .addColumn("cancel_url", "text", (c) =>
          c.check(maxLen("cancel_url", 1000)),
        )
        .addColumn("reschedule_url", "text", (c) =>
          c.check(maxLen("reschedule_url", 1000)),
        )
        .addColumn("created_at", "text", (c) => c.notNull().defaultTo(now))
        .addColumn("updated_at", "text", (c) => c.notNull().defaultTo(now))
        .addColumn("event_type_id", "text", (c) =>
          c.references("booking_event_types.id").onDelete("set null"),
        )
        .addColumn("invitee_phone", "text", (c) =>
          c.check(maxLen("invitee_phone", 60)),
        )
        .addColumn("invitee_timezone", "text", (c) =>
          c.check(maxLen("invitee_timezone", 80)),
        )
        .addColumn("answers", "text", (c) => c.notNull().defaultTo("[]"))
        .addColumn("location", "text", (c) => c.check(maxLen("location", 500)))
        .addColumn("admin_notes", "text", (c) =>
          c.check(maxLen("admin_notes", 10000)),
        )
        .addColumn("manage_token_hash", "text", (c) => c.unique())
        .addColumn("block_start", "text")
        .addColumn("block_end", "text")
        .addColumn("reminder_sent_at", "text")
        .addColumn("sequence", "integer", (c) => c.notNull().defaultTo(0))
        .execute()
      await sql
        .raw(
          `insert into bookings_new (provider, ${shared}) select provider, ${shared} from bookings`,
        )
        .execute(db)
      await db.schema.dropTable("bookings").execute()
      await db.schema.alterTable("bookings_new").renameTo("bookings").execute()
      await db.schema
        .createIndex("bookings_start_idx")
        .on("bookings")
        .column("start_time")
        .execute()
      await db.schema
        .createIndex("bookings_user_idx")
        .on("bookings")
        .columns(["user_id", "start_time"])
        .execute()
      await db.schema
        .createIndex("bookings_email_idx")
        .on("bookings")
        .columns(["invitee_email", "start_time"])
        .execute()
    },
    async down() {
      throw new Error("0003_native_booking cannot be undone")
    },
  }
}
