# Working in this repository

Guidance for AI coding agents, and a quick start for people. Base Suite is a SvelteKit business platform: a public site, an admin portal, a customer portal and switchable modules, on SQLite, Postgres or Cloudflare D1.

## Commands

```sh
./setup.sh setup              # first run: install, database, sample content, start the app
./setup.sh start | stop | restart | status | logs
./setup.sh switch agency      # load a sample site (agency, enterprise, portfolio)
./checks.sh                   # format, lint, types, tests: must pass before you finish
./setup.sh demo:local agency  # run a sample site in the Cloudflare Workers runtime
```

## Read first

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): data layer, modules, request lifecycle.
- [docs/EXTENDING.md](docs/EXTENDING.md): where things live, themes, sample sites, new modules.
- [docs/MODULES.md](docs/MODULES.md): setup, roles and the security model.
- [docs/DEPLOY_CLOUDFLARE.md](docs/DEPLOY_CLOUDFLARE.md): how the Cloudflare build differs.

## Rules

- **Permissions.** Every admin `load`, form action and endpoint calls `requireModule` and `requirePermission`. Layout loads do not protect actions. Customer portal reads filter by the signed-in user's id.
- **Input and output.** Validate input with zod on the server and cap string lengths. Never use `{@html}` on anything not sanitised on the server.
- **Database.** Write migrations with portable SQL that runs on SQLite, Postgres and D1. Add the types to `schema.ts`, and test with `createTestDb()`. Do not rely on a transaction for correctness, because D1 has none.
- **Platforms.** Server code runs on Node and on Workers. Node-only modules (`node:fs`, native packages) load behind `__CLOUDFLARE__` checks or dynamic imports, as in `src/lib/server/media.ts`.
- **Secrets.** Keys come from environment variables or Cloudflare secrets, never from code, settings or committed files. `.env`, `.dev.vars`, `data/` and `wrangler.demo-*.toml` are ignored by git and must stay that way.
- **The assistant package** (`packages/assistant`) imports nothing from Base Suite. Only `src/lib/server/assistant.ts` joins the two.
- **Text.** Plain ASCII in code, comments and docs: a hyphen for a dash, no curly quotes or arrow characters. Comments say what something is, in at most two lines.

## Before you finish

Run `./checks.sh` and make sure it passes. For changes to pages or flows, open the app and try the change. For anything that touches the platform layer, also run `./setup.sh demo:local agency`.
