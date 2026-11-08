# Base Suite

A SvelteKit platform for running a small business online: a website the owner edits from an admin portal, plus modules for contact, live chat, booking, newsletter, Stripe subscriptions, CRM and analytics. It runs on a single SQLite file by default, so a laptop or a small VPS is enough. Point `DATABASE_URL` at Postgres when you want a database server, or deploy it to Cloudflare Workers with D1 and R2. Modules can be left out of the build or switched off at runtime, and every admin action checks permissions on the server.

Started from [CMSaasStarter](https://github.com/CriticalMoments/CMSaasStarter) (MIT) for the account pages, Stripe checkout and billing portal.

## What is in it

| Module                        | Category  | What it adds                                                                                                                       |
| ----------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Pages & Blog `cms`            | Website   | Pages at `/<slug>`, blog with tags, scheduling, RSS, search and sitemap                                                            |
| Contact form `contact`        | Engage    | Topics, configurable fields, inline validation, spam traps, auto-reply, inbox with statuses and notes                              |
| Live chat `chat`              | Engage    | Lazy chat widget, support inbox, conversation in the customer portal                                                               |
| Online booking `booking`      | Engage    | Built-in scheduling: event types, availability, time zones, reschedule and cancel links, invites, reminders. Calendly optional     |
| Newsletter `newsletter`       | Engage    | Double opt-in, safe unsubscribe, CSV export                                                                                        |
| Subscriptions `subscriptions` | Sell      | Stripe Checkout, billing portal, plans editor, webhook mirror                                                                      |
| CRM `crm`                     | Customers | Contacts captured from every channel, activity timeline, notes, deals pipeline                                                     |
| Analytics `analytics`         | Insights  | Cookie-free page views, top pages and referrers                                                                                    |
| AI assistant `assistant`      | Engage    | Chat from your own content with Needle 3 search, many AI providers and MCP connections. Reusable package, deployable to Cloudflare |

The admin portal (`/admin`) is always on: dashboard, users and roles (admin, editor, support), audit log, settings and the module manager.

Two switches per module. `InstalledModules` in `src/config.ts` decides what is compiled in. Admin -> Modules then turns installed modules on and off at runtime without a redeploy; dependencies are enforced and every toggle is audit-logged.

Everything visitors see is edited in the admin portal: homepage sections, pages, blog posts, media, brand and navigation (name, logo, colours, menus, announcement bar) and pricing plans. Customers get a portal under `/account` with their bookings and support conversation.

## Docs

| Doc                                                          | Read it for                                                             |
| ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)                 | The design, data layer, module anatomy and request lifecycle            |
| [docs/MODULES.md](docs/MODULES.md)                           | Setting up each module, roles, the security model, the site owner guide |
| [docs/EXTENDING.md](docs/EXTENDING.md)                       | Themes, your own sample site, new modules and settings                  |
| [docs/DEPLOY_CLOUDFLARE.md](docs/DEPLOY_CLOUDFLARE.md)       | Deploying to Cloudflare Workers, and the theme demos                    |
| [packages/assistant/README.md](packages/assistant/README.md) | The AI assistant, and reusing it in other projects                      |
| [AGENTS.md](AGENTS.md)                                       | Rules and commands for AI coding agents working on the code             |

## Run it locally

Needs Node 22 or newer. Nothing else: no Docker, no database server.

```
./setup.sh setup
```

This installs dependencies, creates `data/base-suite.db` with the schema and sample content, writes an empty `.env` and starts the app at http://localhost:5173 (it moves to the next free port if that one is busy, and says so).

Locally, the first account you create at `/login/sign_up` becomes the admin. On a deployed site that only happens with the setup code in `PRIVATE_SETUP_CODE`, so nobody else can claim a fresh deploy. Later accounts are plain users; promote one from Admin -> Users, or with:

```
./setup.sh admin you@example.com
```

Without an email provider configured, sign-up skips email verification and the forgot-password page explains that a reset link cannot be sent.

Other commands: `start`, `stop`, `restart`, `status`, `logs [n]`, `db:migrate`, `db:seed [profile]`, `db:profiles`, `db:shell` (needs `sqlite3`), `db:reset [profile]` (wipes the local database), `test`, `check`, `build`, `clean`, and the Cloudflare ones: `cf:build`, `demo:local`, `demo:all`, `demo:stop`, `demo:deploy`. `./setup.sh help` lists them.

### Sample sites

Three complete sample sites show the platform set up for different businesses. Each one sets the theme, brand colours, menus, homepage sections, module switches, pages and blog posts:

| Profile      | Site             | Theme     | What it shows                                                                              |
| ------------ | ---------------- | --------- | ------------------------------------------------------------------------------------------ |
| `agency`     | Northlane Studio | Studio    | Small web + AI agency: services, case studies, retainer pricing, every module on           |
| `enterprise` | Halden Systems   | Corporate | Large industrial group: solutions, industries, careers, newsroom, sales-led contact        |
| `portfolio`  | John Doe         | Minimal   | Individual designer: work, about, now and uses pages, writing-first blog, no chat or plans |

```
./setup.sh switch agency        # load a sample site and restart the app
./setup.sh db:seed enterprise   # same, without restarting (live within 30 seconds)
./setup.sh db:reset portfolio   # fresh database with that profile
./setup.sh db:profiles          # list them
```

Switching replaces the pages, posts and site settings with that profile (accounts, chats, bookings and CRM data are kept), so do it on a local or throwaway database. Each profile is a full site: an information architecture of 10 to 20 pages, a blog with cover images, menus, homepage sections, module switches and the blog title (Newsroom, Writing). The content lives in `src/lib/server/db/profiles/`, one file per profile; copy one to make your own.

The logos, hero images, post covers and page figures under `static/samples/` are generated from each profile's palette by `python3 scripts/sample_images.py` (needs `rsvg-convert`, `brew install librsvg`). Edit the titles in that script and rerun it when you change a profile's posts.

Themes are presets in `src/lib/server/theme.ts` (Fresh, Studio, Corporate, Minimal) that set the background tones, corner radius, fonts and hero layout. Pick one in Admin -> Brand & navigation next to the brand colours. [docs/EXTENDING.md](docs/EXTENDING.md) shows how to add a theme or your own sample site.

Each sample site also runs as a live demo on Cloudflare, one Worker per theme: `./setup.sh demo:all` runs all three in the Workers runtime on your machine, and `./setup.sh demo:deploy agency` puts one on your account. See [docs/DEPLOY_CLOUDFLARE.md](docs/DEPLOY_CLOUDFLARE.md#theme-demos).

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
| `PRIVATE_SETUP_CODE`                              | Lets the first sign-up with this code become admin on a deployed site                       |
| `PRIVATE_SECRETS_KEY`                             | Encrypts keys saved in the admin. Required on Cloudflare; locally a key file is made        |
| `CRON_SECRET`                                     | Protects `/api/cron`, which the Cloudflare Cron Trigger calls to send booking reminders     |

Sign-in is configured in Admin -> Sign-in: turn it on or off, allow or close new accounts, and add Google or GitHub with your own keys. Steps are in [docs/MODULES.md](docs/MODULES.md).

`.env.example` has the full list with comments. Site name, logo and public links are set in Admin -> Brand & navigation. The favicon is in `static/`.

## Going to production

Three ways to host it:

- **Cloudflare Workers** with D1 and R2: no server, follow [docs/DEPLOY_CLOUDFLARE.md](docs/DEPLOY_CLOUDFLARE.md).
- **A Node host with a disk** (a VPS, Fly.io or Railway volume, your own server) on SQLite. Back up by copying `data/` while the app is stopped, or use `sqlite3 data/base-suite.db ".backup out.db"` while it runs.
- **A Node host without a disk** (Vercel, Netlify and the like) with `DATABASE_URL` set to Postgres (Neon, Supabase, RDS). The same schema and tests run there, see `.github/workflows/database.yml`.

Stripe

1. Create one product per paid tier, with monthly and yearly prices if you want both. The free plan is handled in the app.
2. Set the secret key in `PRIVATE_STRIPE_API_KEY`, then enter the plans with their Stripe price and product IDs in Admin -> Pricing plans. Checkout only ever uses a configured plan's price.
3. In the Stripe customer portal settings, turn off editing the email address; the app owns that.
4. For Admin -> Subscriptions, add a webhook to `https://YOUR_DOMAIN/api/webhooks/stripe` for the `customer.subscription.*` events and set `PRIVATE_STRIPE_WEBHOOK_SECRET`.

Email and booking: email goes through Resend, see [email_docs.md](email_docs.md); set `PRIVATE_RESEND_API_KEY` and `PRIVATE_FROM_EMAIL` to turn on verification emails, password reset and newsletter double opt-in. Booking is built in: set Availability and Event types under Admin -> Bookings, steps in [docs/MODULES.md](docs/MODULES.md).

Deploy on Node: `npm run build`, then `node build` (set `BODY_SIZE_LIMIT=6M` so media uploads go through, `ORIGIN` to your public URL and `PRIVATE_SETUP_CODE` to claim the admin account). `BUILD_TARGET=cloudflare` builds for Workers instead. Public pages are rendered on the server and cached for a minute behind a CDN, so admin edits show up within about a minute.

## Checks

`./checks.sh` runs formatting, lint, type check and unit tests on an in-memory SQLite. `TEST_DATABASE_URL=postgresql://... npm run test_run` runs the same tests on a throwaway Postgres database (it drops the public schema first). Both run in GitHub Actions (`.github/workflows`); enable workflows on a fresh fork.

## License and credits

MIT, see [LICENSE](LICENSE). Built on CMSaasStarter by Steve Cosman.
