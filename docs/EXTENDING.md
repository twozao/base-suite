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

## Plugins: extensions, apps and the API

WordPress plugins run inside the site with full access to it, which is where most WordPress break-ins start. Base Suite has three levels instead, from most to least trusted:

| Level     | What it is                                                          | Runs code in the site | Added by                   |
| --------- | ------------------------------------------------------------------- | --------------------- | -------------------------- |
| Module    | Code compiled into the build (`src/lib/modules.ts`)                 | Yes, reviewed code    | A developer, then a deploy |
| Extension | A JSON package: content types, blocks, entries, redirects, switches | No                    | The owner, in the admin    |
| App       | A service on its own address that gets signed requests              | No                    | The owner, in the admin    |

### Extensions

Admin -> Extensions installs one from the catalogue (`src/lib/server/plugins/catalogue.ts`) or from an uploaded `.json` file. The package is checked by `manifestSchema` in `src/lib/server/plugins/extensions.ts`. Everything it adds carries its id, so removing it takes exactly that away, or keeps the content as your own.

```json
{
  "id": "events-lite",
  "name": "Events",
  "version": "1.0.0",
  "description": "Upcoming events at /events",
  "contentTypes": [
    {
      "slug": "event",
      "name": "Events",
      "singular": "Event",
      "url_prefix": "events",
      "fields": [
        {
          "key": "starts",
          "label": "Starts",
          "type": "date",
          "required": true,
          "showInList": true
        },
        {
          "key": "venue",
          "label": "Venue",
          "type": "text",
          "showInList": true
        },
        { "key": "tickets", "label": "Tickets", "type": "link" }
      ]
    }
  ],
  "entries": [
    {
      "type": "event",
      "slug": "launch-night",
      "title": "Launch night",
      "fields": { "starts": "2027-01-15" },
      "status": "draft"
    }
  ],
  "blocks": [
    {
      "name": "Next event",
      "blocks": [{ "type": "markdown", "md": "See you there." }]
    }
  ],
  "redirects": [{ "from": "/whats-on", "to": "/events" }],
  "settings": { "seo": { "structuredData": true } }
}
```

Field types: `text`, `textarea`, `markdown`, `number`, `date`, `image`, `link`, `select` (with `options`), `boolean` and `relation` (with `relation` set to another type's slug). Blocks use the same JSON as the block editor (`src/lib/blocks.ts`).

### Apps

Admin -> Apps connects a service you run elsewhere, for example its own Worker. You give it a name, its https address, the permissions it may use and the events it wants. The site shows a signing secret and, when permissions are ticked, an API token, once.

Every request the site makes to an app is a JSON POST with the header `x-base-suite-signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<body>" with the secret>`. Check it, and refuse anything older than five minutes. An app may answer:

| Path                    | Body the site sends                                              | Answer                                                                                                     |
| ----------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `/manifest`             | `{ "site": "https://..." }`                                      | `{ "blocks": [{ "name": "weather", "label": "Weather", "props": [{ "key": "city", "label": "City" }] }] }` |
| `/blocks/render`        | `{ "block": "weather", "props": { "city": "Lisbon" } }`          | `{ "blocks": [ core blocks ] }`, rendered and sanitised by the site                                        |
| `/events`               | `{ "event": "content.published", "at": "...", "data": { ... } }` | Any 2xx; anything else is retried for about 15 hours                                                       |
| Admin screen (optional) | Opened in a sandboxed frame with `?context=...&signature=...`    | Your page; the signed context says which staff member is looking                                           |

App blocks are rendered when the page is saved, with a three-second limit. An app that is slow, down or switched off simply adds nothing. An app never gets the database, users, passwords or the site's keys; it reads and writes through the Content API with its own token.

### Content API

`/api/v1` returns JSON. Published content needs no token; drafts (`?status=all`), writes and private data need `Authorization: Bearer bs_...` with the matching scope. Tokens are made in Admin -> API & webhooks.

| Method and path                                                                                     | Scope                                         |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `GET /pages`, `/pages/{slug or id}`, `/posts`, `/posts/{slug or id}` (`?tag=`, `?page=`, `?limit=`) | none for published, `content:read` for drafts |
| `GET /types`, `/types/{type}/entries`, `/types/{type}/entries/{slug or id}`                         | as above                                      |
| `POST /pages`, `/posts`, `/types/{type}/entries`; `PATCH` and `DELETE` on `/{...}/{id}`             | `content:write`                               |
| `GET /media`, `POST /media` with `{ "url": "https://..." }`                                         | `media:read`, `media:write`                   |
| `GET /contacts`, `GET /forms/{id}/submissions`                                                      | `contacts:read`, `forms:read`                 |

A write body is `{ "title", "slug"?, "excerpt"?, "blocks"? or "markdown"?, "status": "draft" | "published", "seo_title"?, "seo_description"?, "tags"?, "cover_image_url"?, "author_name"?, "published_at"?, "fields"? }`. It goes through the same checks as the editor, so a published image still needs alt text. Each token is limited to 300 requests a minute.

### Webhooks

Admin -> API & webhooks sends a signed POST (same signature header as apps) to your address when one of these happens: `content.published`, `content.updated`, `content.deleted`, `form.submitted`, `contact.created`, `comment.created`, `booking.created`, `newsletter.subscribed`, `user.created`. Deliveries are logged, retried after 1, 5, 30, 120 and 720 minutes, and can be sent again by hand. Addresses must be public https; private and local addresses are refused.

### Hooks for module code

`src/lib/server/plugins/hooks.ts` holds named points that compiled modules attach to, such as `page.head` for structured data (used by the SEO pack in `plugins/seo.ts`). Hooks are code, so only modules register them; extensions and apps reach them through settings and data.
