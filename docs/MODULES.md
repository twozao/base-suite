# Modules, setup and the security model

Base Suite is a small core plus eight independent modules. This page covers day-to-day setup, roles, the security model and the site owner guide. The design, module anatomy and how to build a module are in [ARCHITECTURE.md](ARCHITECTURE.md).

| Module                        | Public surface                       | Admin surface                                  |
| ----------------------------- | ------------------------------------ | ---------------------------------------------- |
| Pages & Blog `cms`            | `/<slug>`, `/blog`, `/search`        | `/admin/pages`, `/admin/blog`                  |
| Contact form `contact`        | `/contact_us`                        | `/admin/contact` (inbox with status and notes) |
| Live chat `chat`              | Chat widget on every page            | `/admin/support` (inbox, replies, assignment)  |
| Online booking `booking`      | `/book`                              | `/admin/bookings`                              |
| Newsletter `newsletter`       | Signup form, `/newsletter`           | `/admin/newsletter` (subscribers, CSV export)  |
| Subscriptions `subscriptions` | `/pricing`, checkout, billing portal | `/admin/subscriptions`, `/admin/pricing`       |
| CRM `crm`                     | none                                 | `/admin/crm`, `/admin/crm/deals`               |
| Analytics `analytics`         | `/api/pv` beacon                     | `/admin/analytics`                             |

The core is always on: dashboard, users and roles, audit log, settings, brand and homepage editors, media library and the module manager.

Modules are compiled in with `InstalledModules` in `src/config.ts` and switched on or off at runtime in **Admin -> Modules**. When a module is off its routes, endpoints and webhooks return 404, its admin pages leave the sidebar and its data is kept. Day-to-day options (chat greeting, Calendly links, email alerts) are edited in **Admin -> Settings** and stored in `site_settings`, so changing them needs no redeploy.

## Setup

1. **Start it.** `./setup.sh setup` creates the SQLite database at `data/base-suite.db`, migrates it and seeds sample content. On a server, `npm run db:migrate` does the same, or just start the app: pending migrations run on boot.
2. **Make yourself the admin.** The first account created at `/login/sign_up` becomes the admin. From then on grant roles in **Admin -> Users**, or run `./setup.sh admin you@example.com`.
3. **Optional environment variables.** See `.env.example`.

   | Variable                                                  | Enables                                                              |
   | --------------------------------------------------------- | -------------------------------------------------------------------- |
   | `DATABASE_URL`                                            | Postgres instead of the SQLite file                                  |
   | `PRIVATE_RESEND_API_KEY`, `PRIVATE_FROM_EMAIL`            | Email verification, password reset, welcome email, newsletter opt-in |
   | `PRIVATE_ADMIN_EMAIL`, `PRIVATE_FROM_ADMIN_EMAIL`         | Email alerts for new chats, contact requests and bookings            |
   | `PRIVATE_STRIPE_API_KEY`, `PRIVATE_STRIPE_WEBHOOK_SECRET` | Checkout and the subscription mirror behind Admin -> Subscriptions   |
   | `PRIVATE_CALENDLY_WEBHOOK_SIGNING_KEY`                    | The booking sync behind Admin -> Bookings                            |

### Stripe webhook

In Stripe, go to **Developers -> Webhooks -> Add endpoint**:

- **URL:** `https://YOUR_DOMAIN/api/webhooks/stripe`
- **Events:** `customer.subscription.created`, `.updated`, `.deleted`, `.paused`, `.resumed`

Copy the signing secret into `PRIVATE_STRIPE_WEBHOOK_SECRET`. Each event is verified with Stripe's signature check and processed exactly once (see the `stripe_events` table).

### Calendly

1. In **Admin -> Settings -> Booking**, add each event type's public link, for example `https://calendly.com/you/intro`. Only `https://calendly.com/...` links are accepted.
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

Roles are rows in `user_roles`, written only by the server after an admin's permission check, so nobody can grant themselves a role.

| Permission                                        | admin | editor | support |
| ------------------------------------------------- | :---: | :----: | :-----: |
| `admin.access`                                    |   x   |   x    |    x    |
| `users.view`                                      |   x   |        |    x    |
| `users.manage_roles`                              |   x   |        |         |
| `billing.view`                                    |   x   |        |         |
| `cms.edit`, `cms.publish`                         |   x   |   x    |         |
| `contact.manage`, `chat.respond`, `bookings.view` |   x   |        |    x    |
| `crm.manage`                                      |   x   |        |    x    |
| `newsletter.manage`, `analytics.view`             |   x   |   x    |         |
| `settings.manage`, `audit.view`                   |   x   |        |         |

The mapping lives in `src/lib/permissions.ts`. Add a role by extending `AppRole` in `src/lib/server/db/schema.ts`, the check constraint in a migration, and that map.

## Security model

Each request passes through the following layers:

1. **The `handle` hook** in `src/hooks.server.ts`:
   - sets security headers: `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS and COOP
   - marks `/admin` and `/account` responses as `no-store`
   - resolves the session cookie to a user (a random token whose SHA-256 is stored; 30 days, renewed past half-life)
   - redirects or 404s anyone who isn't staff away from `/admin`
2. **Every admin load and every form action** calls `requirePermission(event, "<permission>")`. Layout loads don't run for form actions, so each action checks for itself.
3. **The database:** all access goes through server code with one handle. Writes happen after the permission check; customer portal reads go through `src/lib/server/portal.ts`, where every function takes the signed-in user's id. Tests on a fresh database assert the scoping with two users.
4. **Accounts:** passwords are hashed with scrypt (node:crypto, no native dependency). Sign-in, sign-up and reset requests are rate limited per address. Changing the email or password and deleting the account all require the current password; a password change signs out every other session. Verification and reset links are one-time tokens that expire in hours.
5. **Content Security Policy** is set in `svelte.config.js`:
   - no inline or third-party scripts; SvelteKit adds hashes for its own scripts
   - Calendly is allowed as a frame only
   - Stripe is allowed as a form target only

Other protections:

- **CMS content:** Markdown is rendered and sanitised once, at save time, with `sanitize-html` and a strict allow-list. `body_html` is never accepted from the client. Even a compromised editor account can't inject script.
- **Media:** uploads are typed by file content (PNG, JPEG, WebP, GIF, AVIF only, never SVG), named by the server and served from `MEDIA_DIR` by `/media/<name>`; the name pattern is checked on every read and write so a path can never leave the folder.
- **Chat:** anonymous visitors are identified by a random 256-bit token in an `httpOnly`, `SameSite=Strict` cookie scoped to `/api/chat`. Only its SHA-256 hash is stored. The JSON endpoints check `Origin`, because SvelteKit's built-in CSRF check only covers form posts.
- **Webhooks:** HMAC signatures are verified with a constant-time comparison. Calendly requests also get a 3-minute replay window. Payloads are size-capped and schema-validated with zod.
- **Rate limits:** contact form, chat, sign-in, sign-up and password reset are limited per IP, per account or per conversation. Windows live in the database, so limits hold across instances. See `RATE_LIMITS` in `src/lib/server/security/rate_limit.ts`.
- **Open redirects:** `?next=` targets are checked by `safeNextPath`.
- **Audit log:** role changes, page publishes and deletes, settings changes, media changes, and contact and chat status changes are written to `audit_log` with the actor and IP.

## Performance

- Public pages are rendered on the server and anonymous visitors get `s-maxage=60, stale-while-revalidate=600`, so a CDN absorbs traffic spikes and admin edits appear within about a minute.
- The chat widget ships as a ~1 KB launcher. The panel and its polling code load only when a visitor opens it. Polling backs off from 4s to 30s and stops while the tab is hidden.
- The booking page embeds Calendly as a lazy iframe, so no Calendly script runs on your origin.
- CMS pages serve stored HTML with no Markdown work per request.
- Settings are cached for 30 seconds per server instance; SQLite runs in WAL mode so reads never wait on writes.
- Admin lists are paginated server-side and backed by indexes.

## Testing

| Command                                               | What it checks                                                                                                                                 |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run test_run`                                    | Behaviour tests on an in-memory SQLite: accounts and sessions, rate limits, portal scoping, chat counters, CRM capture, Stripe sync, sanitiser |
| `TEST_DATABASE_URL=postgresql://... npm run test_run` | The same suite on a throwaway Postgres database (its public schema is dropped first)                                                           |
| `npm run check` / `npm run lint`                      | Types and lint                                                                                                                                 |

## Content management (site owner guide)

Everything visitors see is edited from the admin portal. No code changes or redeploys are needed.

| Admin page                              | What it controls                                                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Content -> Homepage**                 | Hero, stats, features, steps, testimonials, FAQ, closing call to action. Each section can be shown or hidden.                        |
| **Content -> Pages**                    | Pages at `/<slug>` (About, Terms, Privacy, ...)                                                                                      |
| **Content -> Blog**                     | Posts at `/blog/<slug>`: cover image, tags, author, scheduled publishing. RSS at `/blog/rss.xml`.                                    |
| **Content -> Media**                    | Image uploads (PNG, JPEG, WebP, GIF, AVIF, up to 5 MB; checked by file content). Every image field has a "Choose from Media" picker. |
| **Configuration -> Brand & navigation** | Site name, logo, colours (applied site-wide), header menu and button, footer columns, social links, announcement bar                 |
| **Configuration -> Pricing plans**      | Plans, prices, features and Stripe price/product IDs. Checkout only ever uses a configured plan's price.                             |

Editors can manage the homepage, pages, blog and media. Brand, pricing and settings are admin-only.

Sample content (three posts and an About page) is inserted by `npm run db:seed` when the tables are empty; the text lives in `src/lib/server/db/seed.ts`.

If you self-host with `adapter-node`, set `BODY_SIZE_LIMIT=6M` so media uploads up to 5 MB are accepted.
