# Base Suite

A SvelteKit platform for running a small business online: a website the owner edits from an admin portal, plus modules for contact, live chat, booking, newsletter, Stripe subscriptions, CRM and analytics. It runs on a single SQLite file by default, so a laptop or a small VPS is enough; point `DATABASE_URL` at Postgres when you want a database server. Modules can be left out of the build or switched off at runtime, and every admin action checks permissions on the server.

Started from [CMSaasStarter](https://github.com/CriticalMoments/CMSaasStarter) (MIT) for the account pages, Stripe checkout and billing portal.

## What is in it

| Module                        | Category  | What it adds                                                                   |
| ----------------------------- | --------- | ------------------------------------------------------------------------------ |
| Pages & Blog `cms`            | Website   | Pages at `/<slug>`, blog with tags, scheduling, RSS, search and sitemap        |
| Contact form `contact`        | Engage    | Spam-protected form, inbox with statuses and notes                             |
| Live chat `chat`              | Engage    | Lazy chat widget, support inbox, conversation in the customer portal           |
| Online booking `booking`      | Engage    | `/book` with Calendly embeds, signed webhook, bookings admin and portal        |
| Newsletter `newsletter`       | Engage    | Double opt-in, safe unsubscribe, CSV export                                    |
| Subscriptions `subscriptions` | Sell      | Stripe Checkout, billing portal, plans editor, webhook mirror                  |
| CRM `crm`                     | Customers | Contacts captured from every channel, activity timeline, notes, deals pipeline |
| Analytics `analytics`         | Insights  | Cookie-free page views, top pages and referrers                                |

The admin portal (`/admin`) is always on: dashboard, users and roles (admin, editor, support), audit log, settings and the module manager.

Two switches per module. `InstalledModules` in `src/config.ts` decides what is compiled in. Admin -> Modules then turns installed modules on and off at runtime without a redeploy; dependencies are enforced and every toggle is audit-logged.

Everything visitors see is edited in the admin portal: homepage sections, pages, blog posts, media, brand and navigation (name, logo, colours, menus, announcement bar) and pricing plans. Customers get a portal under `/account` with their bookings and support conversation.

Docs: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design, data layer, module anatomy and how to build a module; [docs/MODULES.md](docs/MODULES.md) for setup, the security model and the site owner guide.

## Run it locally

Needs Node 22 or newer. Nothing else: no Docker, no database server.

```
./setup.sh setup
```

This installs dependencies, creates `data/base-suite.db` with the schema and sample content, writes an empty `.env` and starts the app at http://localhost:5173 (it moves to the next free port if that one is busy, and says so).

The first account you create at `/login/sign_up` becomes the admin. Later accounts are plain users; promote one from Admin -> Users, or with:

```
./setup.sh admin you@example.com
```

Without an email provider configured, sign-up skips email verification and the forgot-password page explains that a reset link cannot be sent.

Other commands: `start`, `stop`, `restart`, `status`, `logs [n]`, `db:migrate`, `db:seed`, `db:shell` (needs `sqlite3`), `db:reset` (wipes the local database), `test`, `check`, `build`, `clean`. `./setup.sh help` lists them.

## Configuration

| Variable                                          | Used for                                                                                    |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                    | Unset or a file path: SQLite. `postgresql://...`: Postgres. The schema is migrated on start |
| `MEDIA_DIR`                                       | Folder for uploaded images (default `data/uploads`), served at `/media/<name>`              |
| `PRIVATE_STRIPE_API_KEY`                          | Checkout and billing portal (optional)                                                      |
| `PRIVATE_STRIPE_WEBHOOK_SECRET`                   | Subscription mirror in Admin -> Subscriptions (optional)                                    |
| `PRIVATE_CALENDLY_WEBHOOK_SIGNING_KEY`            | Booking sync in Admin -> Bookings (optional)                                                |
| `PRIVATE_RESEND_API_KEY`, `PRIVATE_FROM_EMAIL`    | Email verification, password reset, welcome and newsletter emails (optional)                |
| `PRIVATE_ADMIN_EMAIL`, `PRIVATE_FROM_ADMIN_EMAIL` | Alerts for new chats, contact requests and bookings (optional)                              |

`.env.example` has the full list with comments. Site name, logo and public links are set in Admin -> Brand & navigation. The favicon is in `static/`.

## Going to production

Database: SQLite needs a host with a persistent disk (a VPS, Fly.io or Railway volume, your own server). Back up by copying `data/` while the app is stopped, or use `sqlite3 data/base-suite.db ".backup out.db"` while it runs. On serverless hosts (Vercel, Netlify, Cloudflare) there is no disk, so set `DATABASE_URL` to a Postgres database (Neon, Supabase, RDS and the like); the same schema and tests run there, see `.github/workflows/database.yml`.

Stripe

1. Create one product per paid tier, with monthly and yearly prices if you want both. The free plan is handled in the app.
2. Set the secret key in `PRIVATE_STRIPE_API_KEY`, then enter the plans with their Stripe price and product IDs in Admin -> Pricing plans. Checkout only ever uses a configured plan's price.
3. In the Stripe customer portal settings, turn off editing the email address; the app owns that.
4. For Admin -> Subscriptions, add a webhook to `https://YOUR_DOMAIN/api/webhooks/stripe` for the `customer.subscription.*` events and set `PRIVATE_STRIPE_WEBHOOK_SECRET`.

Email and booking: email goes through Resend, see [email_docs.md](email_docs.md); set `PRIVATE_RESEND_API_KEY` and `PRIVATE_FROM_EMAIL` to turn on verification emails, password reset and newsletter double opt-in. Calendly links go in Admin -> Settings -> Booking; recording bookings needs a Calendly webhook subscription, steps in [docs/MODULES.md](docs/MODULES.md).

Deploy: the project uses `adapter-auto`. For a Node host run `npm run build` and `node build` with `adapter-node` (set `BODY_SIZE_LIMIT=6M` so media uploads go through, and `ORIGIN` to your public URL). Public pages are rendered on the server and cached for a minute behind a CDN, so admin edits show up within about a minute.

## Checks

`./checks.sh` runs formatting, lint, type check and unit tests on an in-memory SQLite. `TEST_DATABASE_URL=postgresql://... npm run test_run` runs the same tests on a throwaway Postgres database (it drops the public schema first). Both run in GitHub Actions (`.github/workflows`); enable workflows on a fresh fork.

## License and credits

MIT, see [LICENSE](LICENSE). Built on CMSaasStarter by Steve Cosman.
