# Platform modules

This fork adds five business modules and an admin portal on top of SaaS Starter. Each module can be switched off, and all of them follow the same security and performance rules.

| Module             | Public surface                       | Admin surface                                  | Turned off in                  |
| ------------------ | ------------------------------------ | ---------------------------------------------- | ------------------------------ |
| Subscriptions      | `/pricing`, checkout, billing portal | `/admin/subscriptions`                         | `EnabledModules.subscriptions` |
| Contact form       | `/contact_us`                        | `/admin/contact` (inbox with status and notes) | `EnabledModules.contact`       |
| Live chat          | Chat widget on every page            | `/admin/support` (inbox, replies, assignment)  | `EnabledModules.chat`          |
| Booking (Calendly) | `/book`                              | `/admin/bookings`                              | `EnabledModules.booking`       |
| CMS pages          | `/<slug>`                            | `/admin/pages` (editor, preview, revisions)    | `EnabledModules.cms`           |

The admin manager is always on. It covers the dashboard, users and roles, the audit log and settings.

## Turning modules on and off

Modules are set at build time in `src/config.ts`:

```ts
export const EnabledModules = {
  subscriptions: true,
  contact: true,
  chat: true,
  booking: true,
  cms: true,
}
```

When a module is off:

- its routes, API endpoints and webhooks return 404
- its admin pages disappear from the sidebar
- its client code is not shipped

Day-to-day options are edited in **Admin → Settings** and stored in the `site_settings` table, so changing them needs no redeploy. They include the chat greeting, the Calendly links and whether to send email notifications.

## Setup

1. **Run the migrations.** Apply `supabase/migrations/*.sql`, including `20261102000000_platform_modules.sql`.
2. **Make yourself an admin.** Sign up on your site first. Then run this in the Supabase SQL editor:

   ```sql
   insert into public.user_roles (user_id, role)
   select id, 'admin' from auth.users where email = 'you@example.com';
   ```

   From then on you can grant roles from **Admin → Users**.

3. **Optional environment variables.** See `.env.example`.

   | Variable                                        | Enables                                                   |
   | ----------------------------------------------- | --------------------------------------------------------- |
   | `PRIVATE_STRIPE_WEBHOOK_SECRET`                 | The subscription mirror behind Admin → Subscriptions      |
   | `PRIVATE_CALENDLY_WEBHOOK_SIGNING_KEY`          | The booking sync behind Admin → Bookings                  |
   | `PRIVATE_ADMIN_EMAIL`, `PRIVATE_RESEND_API_KEY` | Email alerts for new chats, contact requests and bookings |

### Stripe webhook

In Stripe, go to **Developers → Webhooks → Add endpoint**:

- **URL:** `https://YOUR_DOMAIN/api/webhooks/stripe`
- **Events:** `customer.subscription.created`, `.updated`, `.deleted`, `.paused`, `.resumed`

Copy the signing secret into `PRIVATE_STRIPE_WEBHOOK_SECRET`. Each event is verified with Stripe's signature check and processed exactly once (see the `stripe_events` table).

### Calendly

1. In **Admin → Settings → Booking**, add each event type's public link, for example `https://calendly.com/you/intro`. Only `https://calendly.com/...` links are accepted.
2. To record bookings in the admin portal, create a webhook subscription. This needs a Calendly paid plan and a personal access token:

   ```sh
   # Find your organization URI
   curl -s https://api.calendly.com/users/me -H "Authorization: Bearer $CALENDLY_TOKEN"

   # Create the subscription with a signing key you generate
   SIGNING_KEY=$(openssl rand -hex 32)
   curl -s -X POST https://api.calendly.com/webhook_subscriptions \
     -H "Authorization: Bearer $CALENDLY_TOKEN" -H "Content-Type: application/json" \
     -d "{\"url\":\"https://YOUR_DOMAIN/api/webhooks/calendly\",
          \"events\":[\"invitee.created\",\"invitee.canceled\"],
          \"organization\":\"<organization uri>\",
          \"scope\":\"organization\",
          \"signing_key\":\"$SIGNING_KEY\"}"
   ```

3. Put the same key in `PRIVATE_CALENDLY_WEBHOOK_SIGNING_KEY`.

Each booking is linked to a user account when the invitee's email matches one.

## Roles and permissions

Roles are stored in `public.user_roles`, which users cannot write to. That means nobody can grant themselves a role, even with the anon key and their own session.

| Permission                                        | admin | editor | support |
| ------------------------------------------------- | :---: | :----: | :-----: |
| `admin.access`                                    |   ✓   |   ✓    |    ✓    |
| `users.view`                                      |   ✓   |        |    ✓    |
| `users.manage_roles`                              |   ✓   |        |         |
| `billing.view`                                    |   ✓   |        |         |
| `cms.edit`, `cms.publish`                         |   ✓   |   ✓    |         |
| `contact.manage`, `chat.respond`, `bookings.view` |   ✓   |        |    ✓    |
| `settings.manage`, `audit.view`                   |   ✓   |        |         |

The mapping lives in `src/lib/permissions.ts`. Add a role by extending the `app_role` enum in a migration and adding it to that map.

## Security model

Each request passes through the following layers:

1. **The `handle` hook** in `src/hooks.server.ts`:
   - sets security headers: `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS and COOP
   - marks `/admin` and `/account` responses as `no-store`
   - redirects or 404s anyone who isn't staff away from `/admin`
2. **Every admin load and every form action** calls `requirePermission(event, "<permission>")`. Layout loads don't run for form actions, so each action checks for itself.
3. **The database:**
   - Every new table has Row Level Security turned on, with no write policies for end users.
   - Writes go through server code using the service role, and only after the permission check.
   - Privileged SQL functions (`rate_limit_hit`, `admin_list_users`) can be run by `service_role` only.
4. **Content Security Policy** is set in `svelte.config.js`:
   - no inline or third-party scripts; SvelteKit adds nonces and hashes for its own scripts
   - Calendly is allowed as a frame only
   - Stripe is allowed as a form target only

Other protections:

- **CMS content:** Markdown is rendered and sanitised once, at save time, with `sanitize-html` and a strict allow-list. `body_html` is never accepted from the client. Even a compromised editor account can't inject script.
- **Chat:** Anonymous visitors are identified by a random 256-bit token in an `httpOnly`, `SameSite=Strict` cookie scoped to `/api/chat`. Only its SHA-256 hash is stored. The JSON endpoints check `Origin`, because SvelteKit's built-in CSRF check only covers form posts.
- **Webhooks:** HMAC signatures are verified with a constant-time comparison. Calendly requests also get a 3-minute replay window. Payloads are size-capped and schema-validated with zod.
- **Rate limits:** contact form, chat start, chat messages and chat polling are limited per IP or per conversation. Limits are stored in Postgres, so they hold across serverless instances. See `RATE_LIMITS` in `src/lib/server/security/rate_limit.ts`.
- **Open redirects:** `?next=` targets are checked by `safeNextPath`, which also closes the starter's `/auth/callback?next=` open redirect.
- **Audit log:** role changes, page publishes and deletes, settings changes, and contact and chat status changes are written to `audit_log` along with the actor and IP.
- **Avatar storage:** the starter's "anyone can upload an avatar" policy is replaced. Users can now write only to their own folder.

## Performance

- Marketing pages stay prerendered.
- The chat widget ships as a ~1 KB launcher. The panel and its polling code load only when a visitor opens it. Polling backs off from 4s to 30s and stops while the tab is hidden.
- The booking page embeds Calendly as a lazy iframe, so no Calendly script runs on your origin.
- CMS pages serve stored HTML with no Markdown work per request. Anonymous visitors get `s-maxage=300, stale-while-revalidate` responses that a CDN can cache.
- Settings are cached for 30 seconds per server instance.
- Admin lists are paginated server-side and backed by indexes. Dashboard counts use `head: true` count queries run in parallel.

## Testing

| Command                          | What it checks                                                                                                                                                                                                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run test_run`               | Unit tests: sanitiser XSS cases, webhook signatures, redirect safety and more                                                                                                                                                                                                              |
| `npm run check` / `npm run lint` | Types and lint                                                                                                                                                                                                                                                                             |
| `./supabase/tests/run.sh`        | Applies every migration to a throwaway Postgres and asserts the RLS rules: anon, users, editors and admins each see exactly what they should; privilege escalation fails; privileged functions are locked down. Needs `psql` and a local Postgres. Pass `DATABASE_URL` to point elsewhere. |

## Adding a module

1. Add a flag to `EnabledModules` in `src/config.ts`.
2. Add tables in a new migration:
   - enable RLS
   - add read policies only
   - write through the service role
   - extend `supabase/tests/rls_test.sql`
3. Add server code under `src/lib/server/<module>/` and keep pure logic unit-testable.
4. Add admin pages under `src/routes/admin/<module>/`. Call `requireModule("<id>")` and `requirePermission(event, "<perm>")` in every load and action.
5. Register the sidebar entry in `src/lib/modules.ts` and any new permission in `src/lib/permissions.ts`.
