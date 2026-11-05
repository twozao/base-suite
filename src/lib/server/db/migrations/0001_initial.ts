import { sql, type ColumnDefinitionBuilder, type Kysely } from "kysely"
import type { Migration } from "kysely/migration"
import type { DialectName } from "../index"

// Portable DDL: text ids, ISO-8601 text timestamps, 0/1 integers for booleans, JSON as text.
// Values are validated with zod before they reach here, so checks only guard sizes and enums.
export const initial = (dialect: DialectName): Migration => {
  const now =
    dialect === "postgres"
      ? sql`to_char((now() at time zone 'utc'), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`
      : sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`
  const oneOf = (col: string, values: string[]) =>
    sql.raw(`${col} in (${values.map((v) => `'${v}'`).join(", ")})`)
  const maxLen = (col: string, n: number) => sql.raw(`length(${col}) <= ${n}`)
  const serial = (c: ColumnDefinitionBuilder) =>
    dialect === "postgres"
      ? c.primaryKey().generatedByDefaultAsIdentity()
      : c.primaryKey().autoIncrement()

  return {
    async up(db: Kysely<unknown>) {
      await db.schema
        .createTable("users")
        .addColumn("id", "text", (c) => c.primaryKey())
        .addColumn("email", "text", (c) =>
          c.notNull().unique().check(maxLen("email", 320)),
        )
        .addColumn("email_verified", "integer", (c) => c.notNull().defaultTo(0))
        .addColumn("password_hash", "text")
        .addColumn("created_at", "text", (c) => c.notNull().defaultTo(now))
        .addColumn("updated_at", "text", (c) => c.notNull().defaultTo(now))
        .addColumn("last_sign_in_at", "text")
        .execute()

      await db.schema
        .createTable("sessions")
        .addColumn("id", "text", (c) => c.primaryKey())
        .addColumn("user_id", "text", (c) =>
          c.notNull().references("users.id").onDelete("cascade"),
        )
        .addColumn("expires_at", "text", (c) => c.notNull())
        .addColumn("created_at", "text", (c) => c.notNull().defaultTo(now))
        .execute()
      await db.schema
        .createIndex("sessions_user_idx")
        .on("sessions")
        .column("user_id")
        .execute()

      await db.schema
        .createTable("auth_tokens")
        .addColumn("token_hash", "text", (c) => c.primaryKey())
        .addColumn("user_id", "text", (c) =>
          c.notNull().references("users.id").onDelete("cascade"),
        )
        .addColumn("purpose", "text", (c) =>
          c
            .notNull()
            .check(oneOf("purpose", ["verify_email", "reset_password"])),
        )
        .addColumn("expires_at", "text", (c) => c.notNull())
        .addColumn("created_at", "text", (c) => c.notNull().defaultTo(now))
        .execute()

      await db.schema
        .createTable("profiles")
        .addColumn("id", "text", (c) =>
          c.primaryKey().references("users.id").onDelete("cascade"),
        )
        .addColumn("full_name", "text", (c) =>
          c.check(maxLen("full_name", 200)),
        )
        .addColumn("company_name", "text", (c) =>
          c.check(maxLen("company_name", 200)),
        )
        .addColumn("website", "text", (c) => c.check(maxLen("website", 500)))
        .addColumn("unsubscribed", "integer", (c) => c.notNull().defaultTo(0))
        .addColumn("updated_at", "text")
        .execute()

      await db.schema
        .createTable("user_roles")
        .addColumn("user_id", "text", (c) =>
          c.notNull().references("users.id").onDelete("cascade"),
        )
        .addColumn("role", "text", (c) =>
          c.notNull().check(oneOf("role", ["admin", "editor", "support"])),
        )
        .addColumn("granted_by", "text", (c) =>
          c.references("users.id").onDelete("set null"),
        )
        .addColumn("created_at", "text", (c) => c.notNull().defaultTo(now))
        .addPrimaryKeyConstraint("user_roles_pk", ["user_id", "role"])
        .execute()

      await db.schema
        .createTable("audit_log")
        .addColumn("id", "integer", serial)
        .addColumn("actor_id", "text", (c) =>
          c.references("users.id").onDelete("set null"),
        )
        .addColumn("action", "text", (c) =>
          c.notNull().check(maxLen("action", 100)),
        )
        .addColumn("target_type", "text", (c) =>
          c.check(maxLen("target_type", 50)),
        )
        .addColumn("target_id", "text", (c) =>
          c.check(maxLen("target_id", 200)),
        )
        .addColumn("meta", "text", (c) => c.notNull().defaultTo("{}"))
        .addColumn("ip", "text", (c) => c.check(maxLen("ip", 64)))
        .addColumn("created_at", "text", (c) => c.notNull().defaultTo(now))
        .execute()
      await db.schema
        .createIndex("audit_log_created_idx")
        .on("audit_log")
        .column("created_at")
        .execute()
      await db.schema
        .createIndex("audit_log_actor_idx")
        .on("audit_log")
        .columns(["actor_id", "created_at"])
        .execute()

      await db.schema
        .createTable("site_settings")
        .addColumn("key", "text", (c) =>
          c.primaryKey().check(maxLen("key", 64)),
        )
        .addColumn("value", "text", (c) => c.notNull())
        .addColumn("updated_by", "text", (c) =>
          c.references("users.id").onDelete("set null"),
        )
        .addColumn("updated_at", "text", (c) => c.notNull().defaultTo(now))
        .execute()

      await db.schema
        .createTable("rate_limits")
        .addColumn("key", "text", (c) =>
          c.primaryKey().check(maxLen("key", 200)),
        )
        .addColumn("window_start", "text", (c) => c.notNull())
        .addColumn("hits", "integer", (c) => c.notNull())
        .execute()

      await db.schema
        .createTable("contact_requests")
        .addColumn("id", "text", (c) => c.primaryKey())
        .addColumn("first_name", "text", (c) =>
          c.check(maxLen("first_name", 200)),
        )
        .addColumn("last_name", "text", (c) =>
          c.check(maxLen("last_name", 200)),
        )
        .addColumn("email", "text", (c) => c.check(maxLen("email", 320)))
        .addColumn("phone", "text", (c) => c.check(maxLen("phone", 60)))
        .addColumn("company_name", "text", (c) =>
          c.check(maxLen("company_name", 200)),
        )
        .addColumn("message_body", "text", (c) =>
          c.check(maxLen("message_body", 10000)),
        )
        .addColumn("status", "text", (c) =>
          c
            .notNull()
            .defaultTo("new")
            .check(oneOf("status", ["new", "open", "closed", "spam"])),
        )
        .addColumn("admin_notes", "text", (c) =>
          c.check(maxLen("admin_notes", 10000)),
        )
        .addColumn("handled_by", "text", (c) =>
          c.references("users.id").onDelete("set null"),
        )
        .addColumn("created_at", "text", (c) => c.notNull().defaultTo(now))
        .addColumn("updated_at", "text", (c) => c.notNull().defaultTo(now))
        .execute()
      await db.schema
        .createIndex("contact_requests_status_idx")
        .on("contact_requests")
        .columns(["status", "created_at"])
        .execute()

      const contentColumns = (t: ReturnType<typeof db.schema.createTable>) =>
        t
          .addColumn("id", "text", (c) => c.primaryKey())
          .addColumn("slug", "text", (c) =>
            c.notNull().unique().check(maxLen("slug", 100)),
          )
          .addColumn("title", "text", (c) =>
            c.notNull().check(maxLen("title", 200)),
          )
          .addColumn("body_md", "text", (c) =>
            c.notNull().defaultTo("").check(maxLen("body_md", 200000)),
          )
          .addColumn("body_html", "text", (c) => c.notNull().defaultTo(""))
          .addColumn("excerpt", "text", (c) => c.check(maxLen("excerpt", 500)))
          .addColumn("seo_title", "text", (c) =>
            c.check(maxLen("seo_title", 200)),
          )
          .addColumn("seo_description", "text", (c) =>
            c.check(maxLen("seo_description", 500)),
          )
          .addColumn("status", "text", (c) =>
            c
              .notNull()
              .defaultTo("draft")
              .check(oneOf("status", ["draft", "published", "archived"])),
          )
          .addColumn("published_at", "text")
          .addColumn("created_by", "text", (c) =>
            c.references("users.id").onDelete("set null"),
          )
          .addColumn("updated_by", "text", (c) =>
            c.references("users.id").onDelete("set null"),
          )
          .addColumn("created_at", "text", (c) => c.notNull().defaultTo(now))
          .addColumn("updated_at", "text", (c) => c.notNull().defaultTo(now))

      await contentColumns(db.schema.createTable("cms_pages")).execute()
      await db.schema
        .createIndex("cms_pages_status_idx")
        .on("cms_pages")
        .columns(["status", "updated_at"])
        .execute()

      await db.schema
        .createTable("cms_page_revisions")
        .addColumn("id", "integer", serial)
        .addColumn("page_id", "text", (c) =>
          c.notNull().references("cms_pages.id").onDelete("cascade"),
        )
        .addColumn("title", "text", (c) => c.notNull())
        .addColumn("body_md", "text", (c) => c.notNull())
        .addColumn("saved_by", "text", (c) =>
          c.references("users.id").onDelete("set null"),
        )
        .addColumn("created_at", "text", (c) => c.notNull().defaultTo(now))
        .execute()
      await db.schema
        .createIndex("cms_page_revisions_page_idx")
        .on("cms_page_revisions")
        .columns(["page_id", "created_at"])
        .execute()

      await contentColumns(db.schema.createTable("posts"))
        .addColumn("cover_image_url", "text", (c) =>
          c.check(maxLen("cover_image_url", 1000)),
        )
        .addColumn("author_name", "text", (c) =>
          c.check(maxLen("author_name", 120)),
        )
        .addColumn("tags", "text", (c) => c.notNull().defaultTo("[]"))
        .execute()
      await db.schema
        .createIndex("posts_status_idx")
        .on("posts")
        .columns(["status", "published_at"])
        .execute()

      await db.schema
        .createTable("chat_conversations")
        .addColumn("id", "text", (c) => c.primaryKey())
        .addColumn("user_id", "text", (c) =>
          c.references("users.id").onDelete("set null"),
        )
        .addColumn("visitor_token_hash", "text", (c) => c.unique())
        .addColumn("visitor_name", "text", (c) =>
          c.check(maxLen("visitor_name", 200)),
        )
        .addColumn("visitor_email", "text", (c) =>
          c.check(maxLen("visitor_email", 320)),
        )
        .addColumn("page_url", "text", (c) => c.check(maxLen("page_url", 2000)))
        .addColumn("status", "text", (c) =>
          c
            .notNull()
            .defaultTo("open")
            .check(oneOf("status", ["open", "pending", "closed"])),
        )
        .addColumn("assigned_to", "text", (c) =>
          c.references("users.id").onDelete("set null"),
        )
        .addColumn("unread_by_staff", "integer", (c) =>
          c.notNull().defaultTo(0),
        )
        .addColumn("unread_by_visitor", "integer", (c) =>
          c.notNull().defaultTo(0),
        )
        .addColumn("last_message_at", "text", (c) => c.notNull().defaultTo(now))
        .addColumn("created_at", "text", (c) => c.notNull().defaultTo(now))
        .addCheckConstraint(
          "chat_conversations_owner",
          sql`user_id is not null or visitor_token_hash is not null`,
        )
        .execute()
      await db.schema
        .createIndex("chat_conversations_inbox_idx")
        .on("chat_conversations")
        .columns(["status", "last_message_at"])
        .execute()
      await db.schema
        .createIndex("chat_conversations_user_idx")
        .on("chat_conversations")
        .columns(["user_id", "last_message_at"])
        .execute()

      await db.schema
        .createTable("chat_messages")
        .addColumn("id", "integer", serial)
        .addColumn("conversation_id", "text", (c) =>
          c.notNull().references("chat_conversations.id").onDelete("cascade"),
        )
        .addColumn("sender", "text", (c) =>
          c.notNull().check(oneOf("sender", ["visitor", "staff", "system"])),
        )
        .addColumn("author_id", "text", (c) =>
          c.references("users.id").onDelete("set null"),
        )
        .addColumn("body", "text", (c) =>
          c.notNull().check(sql.raw("length(body) between 1 and 4000")),
        )
        .addColumn("created_at", "text", (c) => c.notNull().defaultTo(now))
        .execute()
      await db.schema
        .createIndex("chat_messages_conversation_idx")
        .on("chat_messages")
        .columns(["conversation_id", "id"])
        .execute()

      await db.schema
        .createTable("bookings")
        .addColumn("id", "text", (c) => c.primaryKey())
        .addColumn("provider", "text", (c) =>
          c
            .notNull()
            .defaultTo("calendly")
            .check(oneOf("provider", ["calendly"])),
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
            .check(oneOf("status", ["scheduled", "canceled"])),
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
        .execute()
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
        .createTable("stripe_customers")
        .addColumn("user_id", "text", (c) =>
          c.primaryKey().references("users.id").onDelete("cascade"),
        )
        .addColumn("stripe_customer_id", "text", (c) => c.notNull().unique())
        .addColumn("updated_at", "text", (c) => c.notNull().defaultTo(now))
        .execute()

      await db.schema
        .createTable("subscriptions")
        .addColumn("id", "text", (c) => c.primaryKey())
        .addColumn("user_id", "text", (c) =>
          c.references("users.id").onDelete("cascade"),
        )
        .addColumn("stripe_customer_id", "text", (c) => c.notNull())
        .addColumn("status", "text", (c) => c.notNull())
        .addColumn("price_id", "text")
        .addColumn("product_id", "text")
        .addColumn("current_period_end", "text")
        .addColumn("cancel_at_period_end", "integer", (c) =>
          c.notNull().defaultTo(0),
        )
        .addColumn("created_at", "text", (c) => c.notNull().defaultTo(now))
        .addColumn("updated_at", "text", (c) => c.notNull().defaultTo(now))
        .execute()
      await db.schema
        .createIndex("subscriptions_user_idx")
        .on("subscriptions")
        .column("user_id")
        .execute()
      await db.schema
        .createIndex("subscriptions_status_idx")
        .on("subscriptions")
        .column("status")
        .execute()

      await db.schema
        .createTable("stripe_events")
        .addColumn("id", "text", (c) => c.primaryKey())
        .addColumn("type", "text", (c) => c.notNull())
        .addColumn("received_at", "text", (c) => c.notNull().defaultTo(now))
        .execute()

      await db.schema
        .createTable("crm_contacts")
        .addColumn("id", "text", (c) => c.primaryKey())
        .addColumn("email", "text", (c) =>
          c.unique().check(maxLen("email", 320)),
        )
        .addColumn("name", "text", (c) => c.check(maxLen("name", 200)))
        .addColumn("company", "text", (c) => c.check(maxLen("company", 200)))
        .addColumn("phone", "text", (c) => c.check(maxLen("phone", 60)))
        .addColumn("user_id", "text", (c) =>
          c.references("users.id").onDelete("set null"),
        )
        .addColumn("status", "text", (c) =>
          c
            .notNull()
            .defaultTo("lead")
            .check(oneOf("status", ["lead", "customer", "archived"])),
        )
        .addColumn("source", "text", (c) => c.check(maxLen("source", 40)))
        .addColumn("owner_id", "text", (c) =>
          c.references("users.id").onDelete("set null"),
        )
        .addColumn("tags", "text", (c) => c.notNull().defaultTo("[]"))
        .addColumn("notes", "text", (c) => c.check(maxLen("notes", 20000)))
        .addColumn("last_activity_at", "text", (c) =>
          c.notNull().defaultTo(now),
        )
        .addColumn("created_at", "text", (c) => c.notNull().defaultTo(now))
        .addColumn("updated_at", "text", (c) => c.notNull().defaultTo(now))
        .addCheckConstraint(
          "crm_contacts_identity",
          sql`email is not null or name is not null`,
        )
        .execute()
      await db.schema
        .createIndex("crm_contacts_activity_idx")
        .on("crm_contacts")
        .columns(["status", "last_activity_at"])
        .execute()
      await db.schema
        .createIndex("crm_contacts_user_idx")
        .on("crm_contacts")
        .column("user_id")
        .execute()

      await db.schema
        .createTable("crm_deals")
        .addColumn("id", "text", (c) => c.primaryKey())
        .addColumn("contact_id", "text", (c) =>
          c.notNull().references("crm_contacts.id").onDelete("cascade"),
        )
        .addColumn("title", "text", (c) =>
          c.notNull().check(sql.raw("length(title) between 1 and 200")),
        )
        .addColumn("value_cents", "bigint", (c) =>
          c
            .notNull()
            .defaultTo(0)
            .check(sql.raw("value_cents between 0 and 100000000000")),
        )
        .addColumn("currency", "text", (c) =>
          c.notNull().defaultTo("USD").check(maxLen("currency", 3)),
        )
        .addColumn("stage", "text", (c) =>
          c
            .notNull()
            .defaultTo("new")
            .check(
              oneOf("stage", ["new", "qualified", "proposal", "won", "lost"]),
            ),
        )
        .addColumn("owner_id", "text", (c) =>
          c.references("users.id").onDelete("set null"),
        )
        .addColumn("expected_close", "text")
        .addColumn("created_at", "text", (c) => c.notNull().defaultTo(now))
        .addColumn("updated_at", "text", (c) => c.notNull().defaultTo(now))
        .execute()
      await db.schema
        .createIndex("crm_deals_stage_idx")
        .on("crm_deals")
        .columns(["stage", "updated_at"])
        .execute()
      await db.schema
        .createIndex("crm_deals_contact_idx")
        .on("crm_deals")
        .column("contact_id")
        .execute()

      await db.schema
        .createTable("crm_activities")
        .addColumn("id", "integer", serial)
        .addColumn("contact_id", "text", (c) =>
          c.notNull().references("crm_contacts.id").onDelete("cascade"),
        )
        .addColumn("kind", "text", (c) =>
          c
            .notNull()
            .check(
              oneOf("kind", [
                "note",
                "call",
                "email",
                "meeting",
                "chat",
                "contact_form",
                "booking",
                "signup",
                "newsletter",
                "deal",
                "subscription",
              ]),
            ),
        )
        .addColumn("body", "text", (c) => c.check(maxLen("body", 5000)))
        .addColumn("ref_type", "text", (c) => c.check(maxLen("ref_type", 40)))
        .addColumn("ref_id", "text", (c) => c.check(maxLen("ref_id", 200)))
        .addColumn("actor_id", "text", (c) =>
          c.references("users.id").onDelete("set null"),
        )
        .addColumn("created_at", "text", (c) => c.notNull().defaultTo(now))
        .execute()
      await db.schema
        .createIndex("crm_activities_contact_idx")
        .on("crm_activities")
        .columns(["contact_id", "created_at"])
        .execute()

      await db.schema
        .createTable("newsletter_subscribers")
        .addColumn("id", "text", (c) => c.primaryKey())
        .addColumn("email", "text", (c) =>
          c.notNull().unique().check(maxLen("email", 320)),
        )
        .addColumn("name", "text", (c) => c.check(maxLen("name", 200)))
        .addColumn("status", "text", (c) =>
          c
            .notNull()
            .defaultTo("pending")
            .check(oneOf("status", ["pending", "confirmed", "unsubscribed"])),
        )
        .addColumn("confirm_token_hash", "text", (c) => c.unique())
        .addColumn("unsubscribe_token_hash", "text", (c) =>
          c.notNull().unique(),
        )
        .addColumn("source", "text", (c) => c.check(maxLen("source", 100)))
        .addColumn("created_at", "text", (c) => c.notNull().defaultTo(now))
        .addColumn("confirmed_at", "text")
        .addColumn("unsubscribed_at", "text")
        .execute()
      await db.schema
        .createIndex("newsletter_status_idx")
        .on("newsletter_subscribers")
        .columns(["status", "created_at"])
        .execute()

      await db.schema
        .createTable("analytics_daily")
        .addColumn("day", "text", (c) => c.notNull())
        .addColumn("path", "text", (c) =>
          c.notNull().check(maxLen("path", 200)),
        )
        .addColumn("views", "integer", (c) => c.notNull().defaultTo(0))
        .addPrimaryKeyConstraint("analytics_daily_pk", ["day", "path"])
        .execute()
      await db.schema
        .createTable("analytics_referrers")
        .addColumn("day", "text", (c) => c.notNull())
        .addColumn("host", "text", (c) =>
          c.notNull().check(maxLen("host", 120)),
        )
        .addColumn("views", "integer", (c) => c.notNull().defaultTo(0))
        .addPrimaryKeyConstraint("analytics_referrers_pk", ["day", "host"])
        .execute()
    },
    async down(db: Kysely<unknown>) {
      for (const t of [
        "analytics_referrers",
        "analytics_daily",
        "newsletter_subscribers",
        "crm_activities",
        "crm_deals",
        "crm_contacts",
        "stripe_events",
        "subscriptions",
        "stripe_customers",
        "bookings",
        "chat_messages",
        "chat_conversations",
        "posts",
        "cms_page_revisions",
        "cms_pages",
        "contact_requests",
        "rate_limits",
        "site_settings",
        "audit_log",
        "user_roles",
        "profiles",
        "auth_tokens",
        "sessions",
        "users",
      ]) {
        await db.schema.dropTable(t).ifExists().execute()
      }
    },
  }
}
