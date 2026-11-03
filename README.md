# Base Suite

A SvelteKit and Supabase platform for running a small business online: a website the owner edits from an admin portal, plus modules for contact, live chat, booking, newsletter, Stripe subscriptions, CRM and analytics. Modules can be left out of the build or switched off at runtime. Every table has Row Level Security and every admin action checks permissions on the server.

Built on [CMSaasStarter](https://github.com/CriticalMoments/CMSaasStarter) (MIT), which provides auth, account pages, Stripe checkout and the billing portal.

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

Everything visitors see is edited in the admin portal: homepage sections, pages, blog posts, media (Supabase Storage), brand and navigation (name, logo, colours, menus, announcement bar) and pricing plans. Customers get a portal under `/account` with their bookings and support conversation.

Docs: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design, module anatomy, catalogue and how to build a module; [docs/MODULES.md](docs/MODULES.md) for setup, the security model and the site owner guide.

## Run it locally

Needs Node 22+, Docker (colima or Docker Desktop), the Supabase CLI (`brew install supabase/tap/supabase`) and `psql`.

```
./setup.sh setup
```

This installs dependencies, starts a local Supabase in Docker, applies `supabase/migrations` and the sample content in `supabase/seed.sql`, writes `.env` from the local keys (with a placeholder Stripe key) and starts the app.

- App: http://localhost:5173 (moves to the next free port if that one is busy, and says so)
- Supabase Studio: http://127.0.0.1:54323
- Auth emails land in the local inbox: http://127.0.0.1:54324

To get into the admin portal, sign up at `/login/sign_up` and grant yourself the role:

```
./setup.sh admin you@example.com
```

Locally, email confirmation is off (`supabase/config.toml`), so sign-up logs you straight in.

Other commands: `start`, `stop`, `restart`, `status`, `logs [app|db|auth|...]`, `env` (rewrite `.env`), `db:reset` (migrations plus seed, wipes local data), `db:shell`, `test`, `test:rls`, `check`, `build`, `clean`. `./setup.sh help` lists them. Regenerate the sample content with `npx vite-node scripts/generate-seed.ts`.

## Configuration

| Variable                                                                    | Used for                                                                                  |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`                           | Everything. The URL must be present at build time too, the CSP is built from it           |
| `PRIVATE_SUPABASE_SERVICE_ROLE`                                             | Server-side writes behind the admin portal                                                |
| `PRIVATE_STRIPE_API_KEY`                                                    | Checkout and billing portal                                                               |
| `PRIVATE_STRIPE_WEBHOOK_SECRET`                                             | Subscription mirror in Admin -> Subscriptions (optional)                                  |
| `PRIVATE_CALENDLY_WEBHOOK_SIGNING_KEY`                                      | Booking sync in Admin -> Bookings (optional)                                              |
| `PRIVATE_RESEND_API_KEY`, `PRIVATE_ADMIN_EMAIL`, `PRIVATE_FROM_ADMIN_EMAIL` | Welcome and newsletter emails, alerts for chats, contact requests and bookings (optional) |

`.env.example` has the full list. Site name, description and public URL are in `src/config.ts`; the URL (currently `https://example.com`) feeds the sitemap, SEO tags and links in emails, so set it before launch. The favicon is in `static/`.

## Going to production

Supabase

1. Create a project and apply `supabase/migrations/*.sql` in order (paste into the SQL editor, or `supabase link` then `supabase db push`). Load `supabase/seed.sql` only if you want the sample posts and About page.
2. In Auth settings set the Site URL, add `https://YOUR_DOMAIN/auth/callback` and `https://YOUR_DOMAIN/auth/callback?*` to the redirect allow list, and make sure sign-ups are enabled.
3. The built-in email sender only allows a few emails an hour. Set up your own SMTP and put your product name in the email templates.
4. Optional OAuth providers: enable them in the Auth console and list them in `src/routes/(marketing)/login/login_config.ts`.
5. Copy the project URL, anon key and service role key into your host's environment.

Stripe

1. Create one product per paid tier, with monthly and yearly prices if you want both. The free plan is handled in the app.
2. Set the secret key in `PRIVATE_STRIPE_API_KEY`, then enter the plans with their Stripe price and product IDs in Admin -> Pricing plans. Checkout only ever uses a configured plan's price.
3. In the Stripe customer portal settings, turn off editing the email address; the app owns that.
4. For Admin -> Subscriptions, add a webhook to `https://YOUR_DOMAIN/api/webhooks/stripe` for the `customer.subscription.*` events and set `PRIVATE_STRIPE_WEBHOOK_SECRET`.

Email and booking: email goes through Resend, see [email_docs.md](email_docs.md); the welcome email starts sending as soon as the key is set, so review it first. Calendly links go in Admin -> Settings -> Booking; recording bookings needs a Calendly webhook subscription, steps in [docs/MODULES.md](docs/MODULES.md).

Deploy: on Cloudflare Pages pick the SvelteKit preset and add the environment variables above. The project uses `adapter-auto`, so other SvelteKit hosts work as well; with `adapter-node` set `BODY_SIZE_LIMIT=6M` so media uploads go through. Public pages are rendered on the server and cached for a minute behind a CDN, so admin edits show up within about a minute. Third-party analytics (PostHog, Google Analytics) are optional, see [analytics_docs.md](analytics_docs.md).

## Checks

`./checks.sh` runs formatting, lint, type check and unit tests. `./setup.sh test:rls` applies the migrations to a throwaway database and asserts the Row Level Security rules. The same checks run in GitHub Actions (`.github/workflows`); enable workflows on a fresh fork.

## License and credits

MIT, see [LICENSE](LICENSE). Built on CMSaasStarter by Steve Cosman.
