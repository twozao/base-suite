import { env } from "$env/dynamic/private"
import { sql } from "kysely"
import { requirePermission } from "$lib/server/auth/staff"
import { accessConfigured } from "$lib/server/auth/access"
import { mailConfigured } from "$lib/server/auth/flows"
import { cacheVersion } from "$lib/server/cache"
import { migrations } from "$lib/server/db/migrations"
import { listMedia } from "$lib/server/media"
import { platformBindings } from "$lib/server/platform"
import { getSettings } from "$lib/server/settings"
import type { PageServerLoad } from "./$types"

type Check = { label: string; ok: boolean; detail: string }

export const load: PageServerLoad = async (event) => {
  await requirePermission(event, "settings.manage")
  const db = event.locals.db
  const count = async (
    q: Promise<{ n: number | string | bigint } | undefined>,
  ) => Number((await q)?.n ?? 0)
  const applied = await sql<{ name: string }>`select name from kysely_migration`
    .execute(db)
    .then((r) => r.rows.map((x) => x.name))
    .catch(() => [] as string[])
  const known = Object.keys(migrations)
  const pending = known.filter((m) => !applied.includes(m))
  const [
    failedHooks,
    pendingHooks,
    notFound,
    pendingComments,
    reviews,
    staff,
    staff2fa,
    media,
  ] = await Promise.all([
    count(
      db
        .selectFrom("webhook_deliveries")
        .select((eb) => eb.fn.countAll<number>().as("n"))
        .where("status", "=", "failed")
        .executeTakeFirst(),
    ),
    count(
      db
        .selectFrom("webhook_deliveries")
        .select((eb) => eb.fn.countAll<number>().as("n"))
        .where("status", "=", "pending")
        .executeTakeFirst(),
    ),
    count(
      db
        .selectFrom("not_found_log")
        .select((eb) => eb.fn.countAll<number>().as("n"))
        .executeTakeFirst(),
    ),
    count(
      db
        .selectFrom("comments")
        .select((eb) => eb.fn.countAll<number>().as("n"))
        .where("status", "=", "pending")
        .executeTakeFirst(),
    ),
    count(
      db
        .selectFrom("posts")
        .select((eb) => eb.fn.countAll<number>().as("n"))
        .where("review_requested_at", "is not", null)
        .where("status", "!=", "published")
        .executeTakeFirst(),
    ),
    count(
      db
        .selectFrom("user_roles")
        .select((eb) => eb.fn.count<number>("user_id").distinct().as("n"))
        .executeTakeFirst(),
    ),
    count(
      db
        .selectFrom("user_roles as r")
        .select((eb) => eb.fn.count<number>("r.user_id").distinct().as("n"))
        .where((eb) =>
          eb.or([
            eb.exists(
              eb
                .selectFrom("user_totp as t")
                .select("t.user_id")
                .whereRef("t.user_id", "=", "r.user_id")
                .where("t.enabled_at", "is not", null),
            ),
            eb.exists(
              eb
                .selectFrom("user_passkeys as p")
                .select("p.user_id")
                .whereRef("p.user_id", "=", "r.user_id"),
            ),
          ]),
        )
        .executeTakeFirst(),
    ),
    listMedia(),
  ])
  const s = await getSettings(db)
  const bytes = media.files.reduce((a, f) => a + f.size, 0)
  const checks: Check[] = [
    {
      label: "Database schema",
      ok: !pending.length,
      detail: pending.length
        ? `${pending.length} migration(s) not applied: ${pending.join(", ")}`
        : `Up to date (${applied.length} migrations)`,
    },
    {
      label: "Encryption key",
      ok: !!env.PRIVATE_SECRETS_KEY || !__CLOUDFLARE__,
      detail: env.PRIVATE_SECRETS_KEY
        ? "Set from PRIVATE_SECRETS_KEY"
        : __CLOUDFLARE__
          ? "PRIVATE_SECRETS_KEY is missing: stored keys, webhooks and 2FA cannot work"
          : "Using the local key file",
    },
    {
      label: "Email",
      ok: mailConfigured(),
      detail: mailConfigured()
        ? "Resend is set up"
        : "No email provider: verification, resets, reminders and alerts are not sent",
    },
    {
      label: "Scheduled jobs",
      ok: !__CLOUDFLARE__ || !!env.CRON_SECRET,
      detail: __CLOUDFLARE__
        ? env.CRON_SECRET
          ? "Cron secret set (Workers only; Pages has no cron)"
          : "CRON_SECRET missing: reminders and webhook retries do not run"
        : "Running in the server process",
    },
    {
      label: "Webhooks",
      ok: failedHooks === 0,
      detail: `${pendingHooks} waiting, ${failedHooks} failed`,
    },
    {
      label: "Staff two-step sign-in",
      ok: staff === 0 || staff2fa === staff,
      detail: `${staff2fa} of ${staff} staff have an authenticator app or passkey${s.security.requireStaff2fa ? " (required)" : ""}`,
    },
    {
      label: "Admin behind Cloudflare Access",
      ok: accessConfigured(),
      detail: accessConfigured() ? "On" : "Off (optional)",
    },
  ]
  return {
    checks,
    facts: [
      ["Platform", __CLOUDFLARE__ ? "Cloudflare" : "Node"],
      ["Storage", platformBindings().MEDIA ? "R2" : "Local disk"],
      [
        "Media",
        `${media.files.length} files, ${(bytes / 1024 / 1024).toFixed(1)} MB`,
      ],
      ["Page cache version", await cacheVersion(db)],
      ["Addresses not found", String(notFound)],
      ["Comments waiting", String(pendingComments)],
      ["Posts waiting for review", String(reviews)],
    ],
  }
}
