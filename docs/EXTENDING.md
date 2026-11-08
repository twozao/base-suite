# Extending Base Suite

How to make Base Suite your own: change how it looks, start from your own sample site, add a module, or reuse the AI assistant elsewhere. [ARCHITECTURE.md](ARCHITECTURE.md) explains the design these steps rely on.

## Where things live

| Path                           | What is there                                                      |
| ------------------------------ | ------------------------------------------------------------------ |
| `src/config.ts`                | Which modules are built in                                         |
| `src/lib/modules.ts`           | Module list, dependencies and admin menu                           |
| `src/lib/permissions.ts`       | Permissions and the roles that hold them                           |
| `src/lib/server/settings.ts`   | Every setting an admin can change, with defaults (zod)             |
| `src/lib/server/theme.ts`      | Theme presets                                                      |
| `src/lib/server/db/`           | Schema, migrations, the D1 driver and the sample site profiles     |
| `src/lib/server/<module>.ts`   | Server logic per module                                            |
| `src/routes/(marketing)/`      | Public site                                                        |
| `src/routes/admin/`            | Admin portal                                                       |
| `src/routes/(admin)/account/`  | Customer portal                                                    |
| `src/lib/components/site/`     | Header, footer, sections and cards of the public site              |
| `packages/assistant/`          | The AI assistant, a separate package with no Base Suite code in it |
| `cloudflare/`, `wrangler.toml` | Cloudflare Worker entry and config                                 |
| `static/samples/`              | Images for the sample sites                                        |

## Themes

A site's look comes from two settings, both in Admin -> Brand & navigation:

- **Brand colours.** The primary and accent colours.
- **Theme preset.** Background tones, light or dark, corner radius, fonts and the hero layout.

`themeCss()` in `src/lib/server/theme.ts` turns them into CSS variables for the DaisyUI theme, which every component uses. That is why one set of components can look like a dark agency site or a plain writer's site.

To add a preset:

1. Add its id to `THEME_IDS` and an entry to `THEMES` in `src/lib/server/theme.ts`.
2. Run `./checks.sh`. `theme.test.ts` checks that every preset emits its colours, radius and fonts.
3. Pick it in Admin -> Brand & navigation.

Homepage sections (hero, stats, features, steps, testimonials, FAQ, call to action) are settings too, edited in Admin -> Homepage. Change layout in `src/routes/(marketing)/+page.svelte` and the components it uses. Change wording in the admin.

## Your own sample site

A sample site, or profile, is one TypeScript file with everything a site needs: theme and brand, menus, homepage sections, module switches, pages, blog posts and booking event types.

1. Copy `src/lib/server/db/profiles/portfolio.ts` to a new file and change its `id`, `label` and content.
2. Add it to `SEED_PROFILES` in `profiles/index.ts`.
3. Load it locally with `./setup.sh switch YOUR_ID`.
4. For images, add your titles to `scripts/sample_images.py` and run it, or put your own files under `static/samples/YOUR_ID/`.

To run it as a Cloudflare demo, also add its id to `DEMO_PROFILES` and `demo_port` in `setup.sh`, then run `./setup.sh demo:local YOUR_ID`.

## A new module

The full steps are in [ARCHITECTURE.md](ARCHITECTURE.md#building-a-module): register it, add permissions, a migration, server logic and routes, then check that switching it off hides everything. Use only SQL that runs on SQLite, Postgres and D1, and do not rely on transactions for correctness (see [DEPLOY_CLOUDFLARE.md](DEPLOY_CLOUDFLARE.md#how-it-differs-from-node)).

## Settings an admin can change

1. Add a zod schema with defaults to `settingsSchema` in `src/lib/server/settings.ts`.
2. Read it with `getSettings(db)`. It is cached for 30 seconds.
3. Save it from an admin form action with `saveSetting`, after `requirePermission`.

Keys and other secrets never go in settings, because settings reach the browser. Use environment variables, or an encrypted row as `src/lib/server/auth/signin.ts` does.

## The AI assistant

`packages/assistant` works in any project. It needs only a database driver with `all` and `run`, and a function that says who is asking. [Its README](../packages/assistant/README.md) shows how to mount it, deploy it on its own Worker, add providers and MCP connections, and tune welcome messages and small talk. `src/lib/server/assistant.ts` is the one file that joins it to Base Suite. Read it as a worked example.

## For AI coding agents

[AGENTS.md](../AGENTS.md) at the root holds the rules and commands for agents working in this repository. In short: read before changing, keep every check green, never weaken a permission check, and keep secrets out of code and git.
