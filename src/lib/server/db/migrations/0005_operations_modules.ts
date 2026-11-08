import { sql, type ColumnDefinitionBuilder, type Kysely } from "kysely"
import type { Migration } from "kysely/migration"
import type { DialectName } from "../index"

// Tables for helpdesk, knowledge base, forms, campaigns, projects, team, expenses and translations.
// Same portable rules as the first migration: text ids and timestamps, 0/1 integers, JSON as text.
export const operationsModules = (dialect: DialectName): Migration => {
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
  const intId = dialect === "postgres" ? "bigint" : "integer"

  return {
    async up(db: Kysely<unknown>) {
      // ---------------- Helpdesk
      await db.schema
        .createTable("helpdesk_tickets")
        .addColumn("id", intId, serial)
        .addColumn("subject", "text", (c) =>
          c.notNull().check(maxLen("subject", 300)),
        )
        .addColumn("status", "text", (c) =>
          c
            .notNull()
            .defaultTo("open")
            .check(oneOf("status", ["open", "pending", "resolved", "closed"])),
        )
        .addColumn("priority", "text", (c) =>
          c
            .notNull()
            .defaultTo("normal")
            .check(oneOf("priority", ["low", "normal", "high", "urgent"])),
        )
        .addColumn("requester_email", "text", (c) =>
          c.notNull().check(maxLen("requester_email", 320)),
        )
        .addColumn("requester_name", "text", (c) =>
          c.check(maxLen("requester_name", 200)),
        )
        .addColumn("user_id", "text", (c) =>
          c.references("users.id").onDelete("set null"),
        )
        .addColumn("assignee_id", "text", (c) =>
          c.references("users.id").onDelete("set null"),
        )
        .addColumn("source", "text", (c) =>
          c
            .notNull()
            .defaultTo("manual")
            .check(
              oneOf("source", ["portal", "contact", "chat", "email", "manual"]),
            ),
        )
        .addColumn("source_ref", "text", (c) =>
          c.check(maxLen("source_ref", 100)),
        )
        .addColumn("public_token", "text", (c) => c.notNull().unique())
        .addColumn("first_response_due", "text")
        .addColumn("resolve_due", "text")
        .addColumn("first_responded_at", "text")
        .addColumn("resolved_at", "text")
        .addColumn("created_at", "text", (c) => c.notNull().defaultTo(now))
        .addColumn("updated_at", "text", (c) => c.notNull().defaultTo(now))
        .execute()
      await db.schema
        .createIndex("helpdesk_tickets_status_idx")
        .on("helpdesk_tickets")
        .columns(["status", "updated_at"])
        .execute()
      await db.schema
        .createIndex("helpdesk_tickets_user_idx")
        .on("helpdesk_tickets")
        .columns(["user_id", "updated_at"])
        .execute()
      await db.schema
        .createIndex("helpdesk_tickets_source_idx")
        .on("helpdesk_tickets")
        .columns(["source", "source_ref"])
        .execute()
      await db.schema
        .createTable("helpdesk_messages")
        .addColumn("id", intId, serial)
        .addColumn("ticket_id", intId, (c) =>
          c.notNull().references("helpdesk_tickets.id").onDelete("cascade"),
        )
        .addColumn("author_kind", "text", (c) =>
          c.notNull().check(oneOf("author_kind", ["customer", "staff"])),
        )
        .addColumn("author_id", "text", (c) =>
          c.references("users.id").onDelete("set null"),
        )
        .addColumn("internal", "integer", (c) => c.notNull().defaultTo(0))
        .addColumn("body", "text", (c) =>
          c.notNull().check(maxLen("body", 20000)),
        )
        .addColumn("created_at", "text", (c) => c.notNull().defaultTo(now))
        .execute()
      await db.schema
        .createIndex("helpdesk_messages_ticket_idx")
        .on("helpdesk_messages")
        .column("ticket_id")
        .execute()
      await db.schema
        .createTable("helpdesk_canned")
        .addColumn("id", "text", (c) => c.primaryKey())
        .addColumn("title", "text", (c) =>
          c.notNull().check(maxLen("title", 120)),
        )
        .addColumn("body", "text", (c) =>
          c.notNull().check(maxLen("body", 5000)),
        )
        .addColumn("created_at", "text", (c) => c.notNull().defaultTo(now))
        .execute()

      // ---------------- Knowledge base
      await db.schema
        .createTable("kb_categories")
        .addColumn("id", "text", (c) => c.primaryKey())
        .addColumn("slug", "text", (c) =>
          c.notNull().unique().check(maxLen("slug", 80)),
        )
        .addColumn("name", "text", (c) =>
          c.notNull().check(maxLen("name", 120)),
        )
        .addColumn("description", "text", (c) =>
          c.notNull().defaultTo("").check(maxLen("description", 500)),
        )
        .addColumn("sort_order", "integer", (c) => c.notNull().defaultTo(0))
        .execute()
      await db.schema
        .createTable("kb_articles")
        .addColumn("id", "text", (c) => c.primaryKey())
        .addColumn("category_id", "text", (c) =>
          c.references("kb_categories.id").onDelete("set null"),
        )
        .addColumn("slug", "text", (c) =>
          c.notNull().unique().check(maxLen("slug", 120)),
        )
        .addColumn("title", "text", (c) =>
          c.notNull().check(maxLen("title", 200)),
        )
        .addColumn("excerpt", "text", (c) =>
          c.notNull().defaultTo("").check(maxLen("excerpt", 500)),
        )
        .addColumn("body_md", "text", (c) =>
          c.notNull().defaultTo("").check(maxLen("body_md", 200000)),
        )
        .addColumn("body_html", "text", (c) => c.notNull().defaultTo(""))
        .addColumn("status", "text", (c) =>
          c
            .notNull()
            .defaultTo("draft")
            .check(oneOf("status", ["draft", "published"])),
        )
        .addColumn("helpful_yes", "integer", (c) => c.notNull().defaultTo(0))
        .addColumn("helpful_no", "integer", (c) => c.notNull().defaultTo(0))
        .addColumn("created_at", "text", (c) => c.notNull().defaultTo(now))
        .addColumn("updated_at", "text", (c) => c.notNull().defaultTo(now))
        .execute()

      // ---------------- Form builder
      await db.schema
        .createTable("forms")
        .addColumn("id", "text", (c) => c.primaryKey())
        .addColumn("slug", "text", (c) =>
          c.notNull().unique().check(maxLen("slug", 80)),
        )
        .addColumn("title", "text", (c) =>
          c.notNull().check(maxLen("title", 200)),
        )
        .addColumn("description", "text", (c) =>
          c.notNull().defaultTo("").check(maxLen("description", 1000)),
        )
        .addColumn("fields", "text", (c) => c.notNull().defaultTo("[]"))
        .addColumn("submit_label", "text", (c) =>
          c.notNull().defaultTo("Submit").check(maxLen("submit_label", 60)),
        )
        .addColumn("success_message", "text", (c) =>
          c
            .notNull()
            .defaultTo("Thanks, we received your answers.")
            .check(maxLen("success_message", 500)),
        )
        .addColumn("notify_admin", "integer", (c) => c.notNull().defaultTo(1))
        .addColumn("active", "integer", (c) => c.notNull().defaultTo(1))
        .addColumn("created_at", "text", (c) => c.notNull().defaultTo(now))
        .addColumn("updated_at", "text", (c) => c.notNull().defaultTo(now))
        .execute()
      await db.schema
        .createTable("form_submissions")
        .addColumn("id", "text", (c) => c.primaryKey())
        .addColumn("form_id", "text", (c) =>
          c.notNull().references("forms.id").onDelete("cascade"),
        )
        .addColumn("answers", "text", (c) => c.notNull().defaultTo("[]"))
        .addColumn("email", "text", (c) => c.check(maxLen("email", 320)))
        .addColumn("status", "text", (c) =>
          c
            .notNull()
            .defaultTo("new")
            .check(oneOf("status", ["new", "read", "spam"])),
        )
        .addColumn("created_at", "text", (c) => c.notNull().defaultTo(now))
        .execute()
      await db.schema
        .createIndex("form_submissions_form_idx")
        .on("form_submissions")
        .columns(["form_id", "created_at"])
        .execute()

      // ---------------- Email campaigns
      await db.schema
        .createTable("campaigns")
        .addColumn("id", "text", (c) => c.primaryKey())
        .addColumn("subject", "text", (c) =>
          c.notNull().check(maxLen("subject", 200)),
        )
        .addColumn("preheader", "text", (c) =>
          c.notNull().defaultTo("").check(maxLen("preheader", 200)),
        )
        .addColumn("body_md", "text", (c) =>
          c.notNull().defaultTo("").check(maxLen("body_md", 200000)),
        )
        .addColumn("body_html", "text", (c) => c.notNull().defaultTo(""))
        .addColumn("status", "text", (c) =>
          c
            .notNull()
            .defaultTo("draft")
            .check(oneOf("status", ["draft", "scheduled", "sending", "sent"])),
        )
        .addColumn("track", "integer", (c) => c.notNull().defaultTo(1))
        .addColumn("scheduled_at", "text")
        .addColumn("started_at", "text")
        .addColumn("finished_at", "text")
        .addColumn("public_origin", "text", (c) =>
          c.check(maxLen("public_origin", 300)),
        )
        .addColumn("created_at", "text", (c) => c.notNull().defaultTo(now))
        .addColumn("updated_at", "text", (c) => c.notNull().defaultTo(now))
        .execute()
      await db.schema
        .createTable("campaign_recipients")
        .addColumn("token", "text", (c) => c.primaryKey())
        .addColumn("campaign_id", "text", (c) =>
          c.notNull().references("campaigns.id").onDelete("cascade"),
        )
        .addColumn("subscriber_id", "text", (c) =>
          c.references("newsletter_subscribers.id").onDelete("set null"),
        )
        .addColumn("email", "text", (c) =>
          c.notNull().check(maxLen("email", 320)),
        )
        .addColumn("name", "text", (c) => c.check(maxLen("name", 200)))
        .addColumn("status", "text", (c) =>
          c
            .notNull()
            .defaultTo("pending")
            .check(oneOf("status", ["pending", "sending", "sent", "failed"])),
        )
        .addColumn("sent_at", "text")
        .addColumn("opened_at", "text")
        .addColumn("clicked_at", "text")
        .addUniqueConstraint("campaign_recipients_once", [
          "campaign_id",
          "email",
        ])
        .execute()
      await db.schema
        .createIndex("campaign_recipients_status_idx")
        .on("campaign_recipients")
        .columns(["campaign_id", "status"])
        .execute()
      await db.schema
        .createTable("campaign_links")
        .addColumn("id", intId, serial)
        .addColumn("campaign_id", "text", (c) =>
          c.notNull().references("campaigns.id").onDelete("cascade"),
        )
        .addColumn("url", "text", (c) => c.notNull().check(maxLen("url", 2000)))
        .addColumn("clicks", "integer", (c) => c.notNull().defaultTo(0))
        .addUniqueConstraint("campaign_links_once", ["campaign_id", "url"])
        .execute()

      // ---------------- Projects
      await db.schema
        .createTable("projects")
        .addColumn("id", "text", (c) => c.primaryKey())
        .addColumn("name", "text", (c) =>
          c.notNull().check(maxLen("name", 200)),
        )
        .addColumn("description", "text", (c) =>
          c.notNull().defaultTo("").check(maxLen("description", 5000)),
        )
        .addColumn("contact_id", "text", (c) =>
          c.references("crm_contacts.id").onDelete("set null"),
        )
        .addColumn("owner_id", "text", (c) =>
          c.references("users.id").onDelete("set null"),
        )
        .addColumn("status", "text", (c) =>
          c
            .notNull()
            .defaultTo("active")
            .check(oneOf("status", ["active", "on_hold", "done"])),
        )
        .addColumn("due_date", "text")
        .addColumn("shared", "integer", (c) => c.notNull().defaultTo(0))
        .addColumn("created_at", "text", (c) => c.notNull().defaultTo(now))
        .addColumn("updated_at", "text", (c) => c.notNull().defaultTo(now))
        .execute()
      await db.schema
        .createTable("project_tasks")
        .addColumn("id", "text", (c) => c.primaryKey())
        .addColumn("project_id", "text", (c) =>
          c.notNull().references("projects.id").onDelete("cascade"),
        )
        .addColumn("title", "text", (c) =>
          c.notNull().check(maxLen("title", 300)),
        )
        .addColumn("description", "text", (c) =>
          c.notNull().defaultTo("").check(maxLen("description", 5000)),
        )
        .addColumn("status", "text", (c) =>
          c
            .notNull()
            .defaultTo("todo")
            .check(oneOf("status", ["todo", "doing", "review", "done"])),
        )
        .addColumn("assignee_id", "text", (c) =>
          c.references("users.id").onDelete("set null"),
        )
        .addColumn("due_date", "text")
        .addColumn("client_visible", "integer", (c) => c.notNull().defaultTo(1))
        .addColumn("sort_order", "integer", (c) => c.notNull().defaultTo(0))
        .addColumn("created_at", "text", (c) => c.notNull().defaultTo(now))
        .addColumn("updated_at", "text", (c) => c.notNull().defaultTo(now))
        .execute()
      await db.schema
        .createIndex("project_tasks_project_idx")
        .on("project_tasks")
        .columns(["project_id", "status"])
        .execute()

      // ---------------- Team and HR
      await db.schema
        .createTable("team_members")
        .addColumn("id", "text", (c) => c.primaryKey())
        .addColumn("user_id", "text", (c) =>
          c.unique().references("users.id").onDelete("set null"),
        )
        .addColumn("name", "text", (c) =>
          c.notNull().check(maxLen("name", 200)),
        )
        .addColumn("email", "text", (c) => c.check(maxLen("email", 320)))
        .addColumn("phone", "text", (c) => c.check(maxLen("phone", 60)))
        .addColumn("job_title", "text", (c) =>
          c.check(maxLen("job_title", 200)),
        )
        .addColumn("department", "text", (c) =>
          c.check(maxLen("department", 120)),
        )
        .addColumn("start_date", "text")
        .addColumn("leave_allowance", "integer", (c) =>
          c.notNull().defaultTo(20),
        )
        .addColumn("is_booking_host", "integer", (c) =>
          c.notNull().defaultTo(0),
        )
        .addColumn("active", "integer", (c) => c.notNull().defaultTo(1))
        .addColumn("created_at", "text", (c) => c.notNull().defaultTo(now))
        .execute()
      await db.schema
        .createTable("leave_requests")
        .addColumn("id", "text", (c) => c.primaryKey())
        .addColumn("member_id", "text", (c) =>
          c.notNull().references("team_members.id").onDelete("cascade"),
        )
        .addColumn("kind", "text", (c) =>
          c
            .notNull()
            .defaultTo("annual")
            .check(oneOf("kind", ["annual", "sick", "unpaid", "other"])),
        )
        .addColumn("start_date", "text", (c) => c.notNull())
        .addColumn("end_date", "text", (c) => c.notNull())
        .addColumn("days", "integer", (c) => c.notNull())
        .addColumn("note", "text", (c) => c.check(maxLen("note", 1000)))
        .addColumn("status", "text", (c) =>
          c
            .notNull()
            .defaultTo("pending")
            .check(
              oneOf("status", ["pending", "approved", "rejected", "canceled"]),
            ),
        )
        .addColumn("decided_by", "text", (c) =>
          c.references("users.id").onDelete("set null"),
        )
        .addColumn("created_at", "text", (c) => c.notNull().defaultTo(now))
        .execute()
      await db.schema
        .createIndex("leave_requests_member_idx")
        .on("leave_requests")
        .columns(["member_id", "start_date"])
        .execute()
      await db.schema
        .createTable("time_entries")
        .addColumn("id", "text", (c) => c.primaryKey())
        .addColumn("member_id", "text", (c) =>
          c.notNull().references("team_members.id").onDelete("cascade"),
        )
        .addColumn("project_id", "text", (c) =>
          c.references("projects.id").onDelete("set null"),
        )
        .addColumn("work_date", "text", (c) => c.notNull())
        .addColumn("minutes", "integer", (c) => c.notNull())
        .addColumn("note", "text", (c) => c.check(maxLen("note", 500)))
        .addColumn("status", "text", (c) =>
          c
            .notNull()
            .defaultTo("submitted")
            .check(oneOf("status", ["submitted", "approved"])),
        )
        .addColumn("created_at", "text", (c) => c.notNull().defaultTo(now))
        .execute()
      await db.schema
        .createIndex("time_entries_member_idx")
        .on("time_entries")
        .columns(["member_id", "work_date"])
        .execute()

      // ---------------- Expenses
      await db.schema
        .createTable("expenses")
        .addColumn("id", "text", (c) => c.primaryKey())
        .addColumn("spent_on", "text", (c) => c.notNull())
        .addColumn("merchant", "text", (c) =>
          c.notNull().check(maxLen("merchant", 200)),
        )
        .addColumn("amount_cents", "bigint", (c) => c.notNull())
        .addColumn("currency", "text", (c) =>
          c.notNull().defaultTo("USD").check(maxLen("currency", 3)),
        )
        .addColumn("category", "text", (c) =>
          c.notNull().check(maxLen("category", 80)),
        )
        .addColumn("note", "text", (c) => c.check(maxLen("note", 1000)))
        .addColumn("receipt_name", "text", (c) =>
          c.check(maxLen("receipt_name", 200)),
        )
        .addColumn("project_id", "text", (c) =>
          c.references("projects.id").onDelete("set null"),
        )
        .addColumn("submitted_by", "text", (c) =>
          c.references("users.id").onDelete("set null"),
        )
        .addColumn("status", "text", (c) =>
          c
            .notNull()
            .defaultTo("submitted")
            .check(
              oneOf("status", [
                "submitted",
                "approved",
                "rejected",
                "reimbursed",
              ]),
            ),
        )
        .addColumn("decided_by", "text", (c) =>
          c.references("users.id").onDelete("set null"),
        )
        .addColumn("created_at", "text", (c) => c.notNull().defaultTo(now))
        .execute()
      await db.schema
        .createIndex("expenses_spent_idx")
        .on("expenses")
        .columns(["spent_on", "status"])
        .execute()

      // ---------------- Translations
      await db.schema
        .createTable("content_translations")
        .addColumn("kind", "text", (c) =>
          c.notNull().check(oneOf("kind", ["page", "post", "kb"])),
        )
        .addColumn("content_id", "text", (c) => c.notNull())
        .addColumn("locale", "text", (c) =>
          c.notNull().check(maxLen("locale", 10)),
        )
        .addColumn("title", "text", (c) =>
          c.notNull().check(maxLen("title", 200)),
        )
        .addColumn("excerpt", "text", (c) => c.check(maxLen("excerpt", 500)))
        .addColumn("body_md", "text", (c) =>
          c.notNull().defaultTo("").check(maxLen("body_md", 200000)),
        )
        .addColumn("body_html", "text", (c) => c.notNull().defaultTo(""))
        .addColumn("published", "integer", (c) => c.notNull().defaultTo(0))
        .addColumn("updated_at", "text", (c) => c.notNull().defaultTo(now))
        .addPrimaryKeyConstraint("content_translations_pk", [
          "kind",
          "content_id",
          "locale",
        ])
        .execute()
      await db.schema
        .createTable("site_translations")
        .addColumn("locale", "text", (c) =>
          c.notNull().check(maxLen("locale", 10)),
        )
        .addColumn("area", "text", (c) =>
          c
            .notNull()
            .check(oneOf("area", ["brand", "navigation", "home", "ui"])),
        )
        .addColumn("value", "text", (c) => c.notNull().defaultTo("{}"))
        .addPrimaryKeyConstraint("site_translations_pk", ["locale", "area"])
        .execute()
    },
    async down(db: Kysely<unknown>) {
      for (const t of [
        "site_translations",
        "content_translations",
        "expenses",
        "time_entries",
        "leave_requests",
        "team_members",
        "project_tasks",
        "projects",
        "campaign_links",
        "campaign_recipients",
        "campaigns",
        "form_submissions",
        "forms",
        "kb_articles",
        "kb_categories",
        "helpdesk_canned",
        "helpdesk_messages",
        "helpdesk_tickets",
      ]) {
        await db.schema.dropTable(t).ifExists().execute()
      }
    },
  }
}
