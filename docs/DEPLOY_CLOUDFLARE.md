# Deploy to Cloudflare

Base Suite runs on Cloudflare Workers with no server to manage. The same code runs on Node with SQLite or Postgres; on Cloudflare it uses these instead:

| Piece                | On Node                    | On Cloudflare                                                  |
| -------------------- | -------------------------- | -------------------------------------------------------------- |
| App                  | `vite dev` or `node build` | One Worker, entry `cloudflare/worker.js`                       |
| Database             | SQLite file or Postgres    | D1 (SQLite), bound as `DB`                                     |
| Uploaded images      | `data/uploads` on disk     | R2 bucket, bound as `MEDIA`                                    |
| Static files         | Served by the app          | Workers static assets, from the CDN                            |
| Booking reminders    | A timer in the process     | A Cron Trigger every 10 minutes, calling `/api/cron`           |
| Key for stored keys  | `data/secrets.key`         | The `PRIVATE_SECRETS_KEY` secret                               |
| AI search (Needle 3) | A worker thread            | The separate Needle Worker from `packages/assistant`, if bound |

`BUILD_TARGET=cloudflare` switches the build. Code for the other platform is left out at build time, so the Worker never loads native modules.

## Before you start

- A Cloudflare account and `npx wrangler login`.
- **Workers Paid plan** (5 USD a month) for real use. Password hashing uses scrypt, which needs far more CPU than the 10 ms per request the free plan allows, so sign-in would fail there. Browsing public pages fits the free plan.
- Node 22 and `sqlite3` (macOS has it) on your machine, for preparing data.

## Deploy your own site

```sh
npx wrangler d1 create base-suite             # copy the database_id it prints into wrangler.toml
npx wrangler r2 bucket create base-suite-media

# Secrets: one random value each. Never put them in wrangler.toml.
openssl rand -hex 32 | npx wrangler secret put PRIVATE_SECRETS_KEY
openssl rand -hex 32 | npx wrangler secret put CRON_SECRET
npx wrangler secret put PRIVATE_SETUP_CODE   # type a code only you know

./setup.sh cf:build
npx wrangler deploy
```

The schema is created on the first request. Open `/login/sign_up`, and the form asks for the setup code because the site has no admin yet. The account made with the right code becomes the admin, and the code is never asked for again. Without `PRIVATE_SETUP_CODE`, nobody can become admin through the website, so a fresh deploy cannot be taken over by whoever finds it first.

For comments, set `PUBLIC_TURNSTILE_SITE_KEY` (a variable) and `TURNSTILE_SECRET_KEY` (a secret) from a Turnstile widget to check commenters are human. To put Cloudflare Access in front of `/admin`, create an Access application for that path and set `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD`.

Optional secrets, the same names as in `.env.example`: `PRIVATE_RESEND_API_KEY` and `PRIVATE_FROM_EMAIL` for email, `PRIVATE_STRIPE_API_KEY` and `PRIVATE_STRIPE_WEBHOOK_SECRET` for payments, `PRIVATE_ADMIN_EMAIL` for alerts, and the Google or GitHub client keys. Set each with `npx wrangler secret put NAME`.

To start from a sample site instead of an empty one, load it into the empty database before anyone signs up. This also creates `admin@example.com`, whose password is in `data/demo/agency.admin`:

```sh
./setup.sh demo:data agency
npx wrangler d1 execute DB --remote --file data/demo/agency.sql
```

Add a custom domain under the Worker's Settings -> Domains & Routes in the Cloudflare dashboard.

## Theme demos

`./setup.sh demo:*` runs each sample site as its own demo: its own Worker, D1 database and R2 bucket, all from one build. Demos close sign-up, create one admin with a random password, and switch the AI chat on in keyword mode with no AI provider, so nothing costs money per message. The chat's details form is off, so demos collect no names or emails.

| Command                          | What it does                                                                                    |
| -------------------------------- | ----------------------------------------------------------------------------------------------- |
| `./setup.sh demo:local PROFILE`  | Builds, prepares the data and runs the demo in the Workers runtime on your machine (no account) |
| `./setup.sh demo:all`            | All three locally: agency on port 8787, enterprise on 8788, portfolio on 8789                   |
| `./setup.sh demo:stop`           | Stops the local demos                                                                           |
| `./setup.sh demo:deploy PROFILE` | Creates the D1 database and R2 bucket if missing, loads the data, deploys and sets two secrets  |
| `./setup.sh demo:pages PROFILE`  | The same, but deploys to Cloudflare Pages at `base-suite-PROFILE-demo.pages.dev`                |

Profiles are `agency`, `enterprise` and `portfolio`. A Worker demo is at `https://base-suite-PROFILE.YOUR-SUBDOMAIN.workers.dev`, a Pages demo at `https://base-suite-PROFILE-demo.pages.dev`. Sign in as `admin@example.com` with the password in `data/demo/PROFILE.admin`.

Pages or Workers: both run the same app on the same D1 database and R2 bucket. Pages gives a `pages.dev` address and serves static files without running the app. It has no Cron Triggers, so booking reminder emails do not go out from a Pages site; use Workers for a real site that takes bookings. `BUILD_TARGET=cloudflare-pages` builds for Pages into `.svelte-kit/cloudflare-pages`.

`data/demo/` holds each demo's SQL, admin password, D1 ID and Pages folder. It is ignored by git, as are the generated `wrangler.demo-*.toml` files.

`demo:deploy` never overwrites a database that already has data. To reset a demo, delete its database and deploy again:

```sh
npx wrangler d1 delete base-suite-agency && rm data/demo/agency.d1
./setup.sh demo:deploy agency
```

To use another wrangler command, for example a wrapper that picks an account, set `WRANGLER`:

```sh
WRANGLER="npx wrangler" ./setup.sh demo:deploy agency
```

Recent wrangler versions hand new Pages projects over to Workers. `demo:pages` creates the project with `--force` so it stays a classic Pages project with a `pages.dev` address; later commands need no flag.

`wrangler pages` reads its config from the folder with the nearest `package.json`, not from `-c`. That is why `demo:pages` writes each demo's config to `data/demo/pages-PROFILE/` with a small `package.json` of its own; run from the project root it would pick up the root `wrangler.toml`.

## AI assistant on Cloudflare

The assistant works without extra setup. Without the Needle Worker, search runs on keywords.

- **Meaning-based search:** deploy the Needle Worker as in [packages/assistant/README.md](../packages/assistant/README.md), then bind it to the app in `wrangler.toml`:

  ```toml
  [[services]]
  binding = "NEEDLE"
  service = "assistant-needle"
  ```

- **Workers AI as a model:** add `[ai]` with `binding = "AI"`, then add the Cloudflare provider in Admin -> AI assistant -> Model settings.
- **Spending cap:** the assistant stops calling models after 200,000 tokens a day by default. Change it under Rules.

## How it differs from Node

- **No transactions on D1.** D1 runs each statement on its own. Booking checks the slot again after writing, so two people picking the same time at once both get "taken" and pick again, instead of both getting it. Other multi-step writes, such as creating a page with its first revision, can be left half done if a step fails.
- **Page cache.** Public pages tell Cloudflare to cache them for 60 seconds, so busy pages rarely reach the app; admin changes show within a minute. On top of that, the app keeps pages in the Cache API under a version number that every admin change bumps. That second layer got no hits on pages.dev in testing and is not yet tested on a custom domain. Signed-in people always get fresh pages.
- **No cron on Pages.** Booking reminders and webhook retries run from the Cron Trigger, which only Workers have. On Pages a webhook is tried once when the event happens.
- **Settings cache.** Settings are cached for 30 seconds per Worker instance, so an admin change can take that long to show everywhere.
- **Uploads** go to R2 and are served by the app at `/media/<name>`, as on Node.
- **Logs** are in the Cloudflare dashboard under the Worker's Logs, because `observability` is on in `wrangler.toml`.

## Check before you deploy

```sh
./checks.sh              # format, lint, types, tests
./setup.sh demo:local agency
```

`demo:local` runs the real Worker in Cloudflare's local runtime with local D1 and R2, so most problems show up there first. CPU limits are not enforced locally.
