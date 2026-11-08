import { sql, type ColumnDefinitionBuilder, type Kysely } from "kysely"
import type { Migration } from "kysely/migration"
import type { DialectName } from "../index"

// The WordPress-replacement layer: blocks, content types, media details, redirects, 2FA and passkeys,
// the plugin platform (API tokens, webhooks, extensions, apps), editorial review and comments.
export const cmsPlatform = (dialect: DialectName): Migration => {
  const now =
    dialect === "postgres"
      ? sql`to_char((now() at time zone 'utc'), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`
      : sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`
  const oneOf = (col: string, values: (string | number)[]) =>
    sql.raw(
      `${col} in (${values.map((v) => (typeof v === "number" ? v : `'${v}'`)).join(", ")})`,
    )
  const maxLen = (col: string, n: number) => sql.raw(`length(${col}) <= ${n}`)
  const serial = (c: ColumnDefinitionBuilder) =>
    dialect === "postgres"
      ? c.primaryKey().generatedByDefaultAsIdentity()
      : c.primaryKey().autoIncrement()
  const intId = dialect === "postgres" ? "bigint" : "integer"
  const created = (c: ColumnDefinitionBuilder) => c.notNull().defaultTo(now)

  return {
    async up(db: Kysely<unknown>) {
      // ---------------- Blocks, SEO and review on existing content
      for (const table of ["cms_pages", "posts"]) {
        await db.schema
          .alterTable(table)
          .addColumn("blocks_json", "text")
          .execute()
        await db.schema
          .alterTable(table)
          .addColumn("seo_noindex", "integer", (c) => c.notNull().defaultTo(0))
          .execute()
        await db.schema
          .alterTable(table)
          .addColumn("og_image_url", "text", (c) =>
            c.check(maxLen("og_image_url", 500)),
          )
          .execute()
        await db.schema
          .alterTable(table)
          .addColumn("review_requested_at", "text")
          .execute()
        await db.schema
          .alterTable(table)
          .addColumn("review_note", "text", (c) =>
            c.check(maxLen("review_note", 1000)),
          )
          .execute()
      }
      await db.schema
        .alterTable("cms_pages")
        .addColumn("template", "text", (c) =>
          c
            .notNull()
            .defaultTo("default")
            .check(oneOf("template", ["default", "wide", "landing"])),
        )
        .execute()
      await db.schema
        .alterTable("cms_page_revisions")
        .addColumn("blocks_json", "text")
        .execute()

      await db.schema
        .createTable("cms_blocks")
        .addColumn("id", "text", (c) => c.primaryKey())
        .addColumn("name", "text", (c) =>
          c.notNull().check(maxLen("name", 120)),
        )
        .addColumn("blocks_json", "text", (c) => c.notNull().defaultTo("[]"))
        .addColumn("extension_id", "text")
        .addColumn("created_at", "text", created)
        .addColumn("updated_at", "text", created)
        .execute()

      // ---------------- Content types and entries
      await db.schema
        .createTable("content_types")
        .addColumn("id", "text", (c) => c.primaryKey())
        .addColumn("slug", "text", (c) =>
          c.notNull().unique().check(maxLen("slug", 60)),
        )
        .addColumn("name", "text", (c) => c.notNull().check(maxLen("name", 80)))
        .addColumn("singular", "text", (c) =>
          c.notNull().check(maxLen("singular", 80)),
        )
        .addColumn("url_prefix", "text", (c) =>
          c.notNull().unique().check(maxLen("url_prefix", 60)),
        )
        .addColumn("description", "text", (c) =>
          c.check(maxLen("description", 500)),
        )
        .addColumn("fields_json", "text", (c) => c.notNull().defaultTo("[]"))
        .addColumn("has_archive", "integer", (c) => c.notNull().defaultTo(1))
        .addColumn("in_search", "integer", (c) => c.notNull().defaultTo(1))
        .addColumn("extension_id", "text")
        .addColumn("created_at", "text", created)
        .addColumn("updated_at", "text", created)
        .execute()

      await db.schema
        .createTable("content_entries")
        .addColumn("id", "text", (c) => c.primaryKey())
        .addColumn("type_id", "text", (c) =>
          c.notNull().references("content_types.id").onDelete("cascade"),
        )
        .addColumn("slug", "text", (c) =>
          c.notNull().check(maxLen("slug", 100)),
        )
        .addColumn("title", "text", (c) =>
          c.notNull().check(maxLen("title", 200)),
        )
        .addColumn("status", "text", (c) =>
          c
            .notNull()
            .defaultTo("draft")
            .check(oneOf("status", ["draft", "published", "archived"])),
        )
        .addColumn("fields_json", "text", (c) => c.notNull().defaultTo("{}"))
        .addColumn("blocks_json", "text")
        .addColumn("body_md", "text", (c) => c.notNull().defaultTo(""))
        .addColumn("body_html", "text", (c) => c.notNull().defaultTo(""))
        .addColumn("excerpt", "text", (c) => c.check(maxLen("excerpt", 500)))
        .addColumn("seo_title", "text", (c) =>
          c.check(maxLen("seo_title", 200)),
        )
        .addColumn("seo_description", "text", (c) =>
          c.check(maxLen("seo_description", 500)),
        )
        .addColumn("seo_noindex", "integer", (c) => c.notNull().defaultTo(0))
        .addColumn("og_image_url", "text", (c) =>
          c.check(maxLen("og_image_url", 500)),
        )
        .addColumn("sort_order", "integer", (c) => c.notNull().defaultTo(0))
        .addColumn("review_requested_at", "text")
        .addColumn("review_note", "text", (c) =>
          c.check(maxLen("review_note", 1000)),
        )
        .addColumn("published_at", "text")
        .addColumn("created_by", "text", (c) =>
          c.references("users.id").onDelete("set null"),
        )
        .addColumn("updated_by", "text", (c) =>
          c.references("users.id").onDelete("set null"),
        )
        .addColumn("created_at", "text", created)
        .addColumn("updated_at", "text", created)
        .addUniqueConstraint("content_entries_type_slug", ["type_id", "slug"])
        .execute()
      await db.schema
        .createIndex("content_entries_type_status_idx")
        .on("content_entries")
        .columns(["type_id", "status", "published_at"])
        .execute()

      // ---------------- Media details
      await db.schema
        .createTable("media")
        .addColumn("name", "text", (c) => c.primaryKey())
        .addColumn("alt", "text", (c) => c.check(maxLen("alt", 300)))
        .addColumn("width", "integer")
        .addColumn("height", "integer")
        .addColumn("focal_x", "integer", (c) => c.notNull().defaultTo(50))
        .addColumn("focal_y", "integer", (c) => c.notNull().defaultTo(50))
        .addColumn("variants", "text", (c) => c.notNull().defaultTo("[]"))
        .addColumn("size", "integer", (c) => c.notNull().defaultTo(0))
        .addColumn("source_url", "text", (c) =>
          c.check(maxLen("source_url", 1000)),
        )
        .addColumn("created_at", "text", created)
        .execute()
      await db.schema
        .createIndex("media_source_idx")
        .on("media")
        .column("source_url")
        .execute()

      // ---------------- Redirects and 404s
      await db.schema
        .createTable("redirects")
        .addColumn("id", intId, serial)
        .addColumn("from_path", "text", (c) =>
          c.notNull().unique().check(maxLen("from_path", 500)),
        )
        .addColumn("to_url", "text", (c) =>
          c.notNull().check(maxLen("to_url", 1000)),
        )
        .addColumn("status_code", "integer", (c) =>
          c
            .notNull()
            .defaultTo(301)
            .check(oneOf("status_code", [301, 302, 307, 308])),
        )
        .addColumn("hits", "integer", (c) => c.notNull().defaultTo(0))
        .addColumn("extension_id", "text")
        .addColumn("created_at", "text", created)
        .execute()
      await db.schema
        .createTable("not_found_log")
        .addColumn("path", "text", (c) =>
          c.primaryKey().check(maxLen("path", 500)),
        )
        .addColumn("hits", "integer", (c) => c.notNull().defaultTo(1))
        .addColumn("referrer", "text", (c) => c.check(maxLen("referrer", 500)))
        .addColumn("last_seen", "text", created)
        .execute()

      // ---------------- Two-factor sign-in and passkeys
      await db.schema
        .createTable("user_totp")
        .addColumn("user_id", "text", (c) =>
          c.primaryKey().references("users.id").onDelete("cascade"),
        )
        .addColumn("secret", "text", (c) => c.notNull())
        .addColumn("enabled_at", "text")
        .addColumn("last_step", "integer", (c) => c.notNull().defaultTo(0))
        .addColumn("created_at", "text", created)
        .execute()
      await db.schema
        .createTable("user_recovery_codes")
        .addColumn("id", intId, serial)
        .addColumn("user_id", "text", (c) =>
          c.notNull().references("users.id").onDelete("cascade"),
        )
        .addColumn("code_hash", "text", (c) => c.notNull())
        .addColumn("used_at", "text")
        .execute()
      await db.schema
        .createTable("mfa_challenges")
        .addColumn("token_hash", "text", (c) => c.primaryKey())
        .addColumn("user_id", "text", (c) =>
          c.notNull().references("users.id").onDelete("cascade"),
        )
        .addColumn("next_path", "text", (c) =>
          c.check(maxLen("next_path", 500)),
        )
        .addColumn("attempts", "integer", (c) => c.notNull().defaultTo(0))
        .addColumn("expires_at", "text", (c) => c.notNull())
        .execute()
      await db.schema
        .createTable("user_passkeys")
        .addColumn("id", "text", (c) => c.primaryKey().check(maxLen("id", 512)))
        .addColumn("user_id", "text", (c) =>
          c.notNull().references("users.id").onDelete("cascade"),
        )
        .addColumn("public_key", "text", (c) => c.notNull())
        .addColumn("counter", "integer", (c) => c.notNull().defaultTo(0))
        .addColumn("transports", "text", (c) => c.notNull().defaultTo("[]"))
        .addColumn("name", "text", (c) => c.notNull().check(maxLen("name", 80)))
        .addColumn("created_at", "text", created)
        .addColumn("last_used_at", "text")
        .execute()
      await db.schema
        .createTable("passkey_challenges")
        .addColumn("token_hash", "text", (c) => c.primaryKey())
        .addColumn("challenge", "text", (c) => c.notNull())
        .addColumn("user_id", "text", (c) =>
          c.references("users.id").onDelete("cascade"),
        )
        .addColumn("purpose", "text", (c) =>
          c.notNull().check(oneOf("purpose", ["register", "signin"])),
        )
        .addColumn("expires_at", "text", (c) => c.notNull())
        .execute()
      for (const [col, type] of [
        ["user_agent", "text"],
        ["last_seen_at", "text"],
        ["mfa", "integer"],
      ] as const) {
        await db.schema
          .alterTable("sessions")
          .addColumn(col, type, (c) =>
            col === "mfa" ? c.notNull().defaultTo(0) : c,
          )
          .execute()
      }

      // ---------------- WordPress imports
      await db.schema
        .createTable("wp_imports")
        .addColumn("id", intId, serial)
        .addColumn("origin", "text", (c) =>
          c.notNull().check(maxLen("origin", 300)),
        )
        .addColumn("filename", "text", (c) => c.check(maxLen("filename", 200)))
        .addColumn("counts_json", "text", (c) => c.notNull().defaultTo("{}"))
        .addColumn("created_by", "text", (c) =>
          c.references("users.id").onDelete("set null"),
        )
        .addColumn("created_at", "text", created)
        .execute()

      // ---------------- Plugin platform
      await db.schema
        .createTable("api_tokens")
        .addColumn("id", "text", (c) => c.primaryKey())
        .addColumn("name", "text", (c) =>
          c.notNull().check(maxLen("name", 120)),
        )
        .addColumn("token_hash", "text", (c) => c.notNull().unique())
        .addColumn("scopes", "text", (c) => c.notNull().defaultTo("[]"))
        .addColumn("app_id", "text")
        .addColumn("created_by", "text", (c) =>
          c.references("users.id").onDelete("set null"),
        )
        .addColumn("last_used_at", "text")
        .addColumn("revoked_at", "text")
        .addColumn("created_at", "text", created)
        .execute()
      await db.schema
        .createTable("webhooks")
        .addColumn("id", "text", (c) => c.primaryKey())
        .addColumn("url", "text", (c) => c.notNull().check(maxLen("url", 1000)))
        .addColumn("secret", "text", (c) => c.notNull())
        .addColumn("events", "text", (c) => c.notNull().defaultTo("[]"))
        .addColumn("active", "integer", (c) => c.notNull().defaultTo(1))
        .addColumn("app_id", "text")
        .addColumn("created_at", "text", created)
        .execute()
      await db.schema
        .createTable("webhook_deliveries")
        .addColumn("id", intId, serial)
        .addColumn("webhook_id", "text", (c) =>
          c.notNull().references("webhooks.id").onDelete("cascade"),
        )
        .addColumn("event", "text", (c) =>
          c.notNull().check(maxLen("event", 80)),
        )
        .addColumn("payload", "text", (c) => c.notNull())
        .addColumn("status", "text", (c) =>
          c
            .notNull()
            .defaultTo("pending")
            .check(oneOf("status", ["pending", "delivered", "failed"])),
        )
        .addColumn("attempts", "integer", (c) => c.notNull().defaultTo(0))
        .addColumn("response_code", "integer")
        .addColumn("error", "text", (c) => c.check(maxLen("error", 500)))
        .addColumn("next_attempt_at", "text", created)
        .addColumn("created_at", "text", created)
        .execute()
      await db.schema
        .createIndex("webhook_deliveries_due_idx")
        .on("webhook_deliveries")
        .columns(["status", "next_attempt_at"])
        .execute()
      await db.schema
        .createTable("extensions")
        .addColumn("id", "text", (c) => c.primaryKey().check(maxLen("id", 60)))
        .addColumn("name", "text", (c) =>
          c.notNull().check(maxLen("name", 120)),
        )
        .addColumn("version", "text", (c) =>
          c.notNull().check(maxLen("version", 20)),
        )
        .addColumn("manifest_json", "text", (c) => c.notNull())
        .addColumn("enabled", "integer", (c) => c.notNull().defaultTo(1))
        .addColumn("installed_by", "text", (c) =>
          c.references("users.id").onDelete("set null"),
        )
        .addColumn("installed_at", "text", created)
        .execute()
      await db.schema
        .createTable("apps")
        .addColumn("id", "text", (c) => c.primaryKey())
        .addColumn("name", "text", (c) =>
          c.notNull().check(maxLen("name", 120)),
        )
        .addColumn("base_url", "text", (c) =>
          c.notNull().check(maxLen("base_url", 500)),
        )
        .addColumn("admin_path", "text", (c) =>
          c.check(maxLen("admin_path", 200)),
        )
        .addColumn("secret", "text", (c) => c.notNull())
        .addColumn("scopes", "text", (c) => c.notNull().defaultTo("[]"))
        .addColumn("blocks", "text", (c) => c.notNull().defaultTo("[]"))
        .addColumn("enabled", "integer", (c) => c.notNull().defaultTo(1))
        .addColumn("created_by", "text", (c) =>
          c.references("users.id").onDelete("set null"),
        )
        .addColumn("created_at", "text", created)
        .execute()

      // ---------------- Comments
      await db.schema
        .createTable("comments")
        .addColumn("id", intId, serial)
        .addColumn("post_id", "text", (c) =>
          c.notNull().references("posts.id").onDelete("cascade"),
        )
        .addColumn("parent_id", intId)
        .addColumn("author_name", "text", (c) =>
          c.notNull().check(maxLen("author_name", 100)),
        )
        .addColumn("author_email", "text", (c) =>
          c.check(maxLen("author_email", 320)),
        )
        .addColumn("user_id", "text", (c) =>
          c.references("users.id").onDelete("set null"),
        )
        .addColumn("body", "text", (c) =>
          c.notNull().check(maxLen("body", 5000)),
        )
        .addColumn("status", "text", (c) =>
          c
            .notNull()
            .defaultTo("pending")
            .check(oneOf("status", ["pending", "approved", "spam"])),
        )
        .addColumn("ip_hash", "text")
        .addColumn("created_at", "text", created)
        .execute()
      await db.schema
        .createIndex("comments_post_idx")
        .on("comments")
        .columns(["post_id", "status", "created_at"])
        .execute()

      // ---------------- Author and contributor roles: the role check is part of the table, so rebuild it
      await db.schema
        .createTable("user_roles_next")
        .addColumn("user_id", "text", (c) =>
          c.notNull().references("users.id").onDelete("cascade"),
        )
        .addColumn("role", "text", (c) =>
          c
            .notNull()
            .check(
              oneOf("role", [
                "admin",
                "editor",
                "author",
                "contributor",
                "support",
              ]),
            ),
        )
        .addColumn("granted_by", "text", (c) =>
          c.references("users.id").onDelete("set null"),
        )
        .addColumn("created_at", "text", created)
        .addPrimaryKeyConstraint("user_roles_next_pk", ["user_id", "role"])
        .execute()
      await sql`insert into user_roles_next (user_id, role, granted_by, created_at) select user_id, role, granted_by, created_at from user_roles`.execute(
        db,
      )
      await db.schema.dropTable("user_roles").execute()
      await db.schema
        .alterTable("user_roles_next")
        .renameTo("user_roles")
        .execute()
    },
    async down() {
      throw new Error("0006_cms_platform cannot be reversed")
    },
  }
}
