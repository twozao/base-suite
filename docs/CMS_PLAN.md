# Base Suite as a WordPress replacement

What Base Suite needs to replace WordPress for a business site, and how to get WordPress-style plugins without the WordPress security record. Written on 2026-11-08 after reviewing Base Suite and the earlier CMS in `~/projects/ai/cloudflare/twozao-stage`.

## Where it stands

Base Suite already covers the core of a business site: pages with revisions and SEO title and description, a blog with tags, scheduling, RSS, search and sitemap, a media library on R2, menus, homepage sections, themes, roles with permissions, an audit log, rate limits, a strict Content Security Policy, and modules for contact, live chat, booking, newsletter, Stripe, CRM, analytics and the AI assistant. It runs on Node, Postgres or Cloudflare.

twozao-stage (a Hono Worker with a SvelteKit front end) had a blog with tags and SEO fields, case studies, a contact inbox, settings and an image library with upload from a URL. Base Suite has all of that except two things: case studies as their own content type, and importing an image from a URL. Both are covered below.

What stops it replacing WordPress today:

| Gap                      | WordPress has                          | Base Suite today                          |
| ------------------------ | -------------------------------------- | ----------------------------------------- |
| Editor                   | Block editor                           | Markdown in a text box                    |
| Content types and fields | Custom post types, custom fields (ACF) | Pages and posts only                      |
| Moving from WordPress    | -                                      | No import, no redirects                   |
| Plugins                  | Install at runtime                     | Modules compiled in, switched on or off   |
| Images                   | Sizes, srcset, alt text, crops         | One file as uploaded                      |
| Editorial workflow       | Author, editor, contributor, review    | Admin and staff roles, no review step     |
| Comments                 | Built in, with moderation              | None                                      |
| Page cache               | Through a caching plugin               | A `s-maxage` header, which Workers ignore |
| Admin sign-in            | 2FA through a plugin                   | Password and OAuth, no 2FA                |

## The plugin model

WordPress plugins are PHP that runs inside the site with full access to the database and files. That is where most WordPress hacks come from: one weak plugin and the whole site is open. Workers also cannot load code at runtime (`eval` and `new Function` are blocked), so copying the WordPress model is neither safe nor possible.

Three levels instead, from most trusted to least:

1. **Modules** (what exists now). Code compiled into the build, reviewed with the core. For features that need the database: booking, Stripe, CRM. Adding one means a deploy.
2. **Extensions**, a new level installed at runtime from Admin -> Extensions. An extension is data, not code: a validated JSON package that adds content types and fields, blocks built from the existing block set, forms, menus, redirects, SEO rules, settings screens and scheduled webhook calls. With no code in it, there is nothing to exploit. Every row an extension creates carries its id, so uninstalling removes it cleanly.
3. **Apps**, for when an extension is not enough: code that runs outside the site, on its own Worker or any HTTPS server, like Shopify apps.
   - It receives signed events (`page.published`, `form.submitted`, `contact.created`) and can answer hooks such as "render this block" within a time limit. If it is slow or down, the site carries on without it.
   - It calls back through a Content API with a token limited to the scopes the owner approved, such as `content:read` or `forms:write`. It never sees users, passwords, sessions or secrets.
   - Its admin screen shows in a sandboxed iframe inside the admin.
   - Every call is rate limited and written to the audit log, and one switch turns it off.

So a site owner can add features without a deploy, and nothing they add can read the database or run inside the site. Running app code inside the Worker in its own sandbox would need Cloudflare's dynamic Worker loading (Worker Loader API) or Workers for Platforms. The first was in beta when last checked; the second is a paid add-on above the 5 USD plan. Not verified for this account; revisit later.

The core work all three levels need:

- **Content API.** REST over pages, posts, content types, media and forms, with scoped tokens created in the admin.
- **Events.** An outbox table, delivered by the cron (Workers) or a queue, with retries and a delivery log.
- **Hooks.** A registry of named points (render a block, validate a form, add to the page head) that modules, extensions and apps attach to.
- **Block renderer.** One server-side renderer for every block. Extensions only arrange existing blocks; apps return block data, never raw HTML.

## What to build, in order

### Phase 1: a site an owner can move to

- **Block editor.** Pages and posts stored as JSON blocks: heading, paragraph, image, gallery, columns, quote, button, embed, FAQ, pricing, form, call to action and markdown. Rendered on the server; the existing markdown stays as one block, so current content keeps working. Reusable blocks and page templates.
- **Content types and custom fields.** Define types such as case studies, team, products, locations or events in the admin. Each gets fields (text, rich text, number, date, image, link, select, relation), its own URL pattern, archive page, sitemap entry and search. This replaces WordPress custom post types and ACF, and covers twozao's case studies.
- **WordPress import.** Upload a WordPress export (WXR) and bring in posts, pages, categories, tags, authors and featured images. Images are copied to R2, and the old permalinks are added as redirects so search rankings carry over.
- **Redirects and 404 log.** A redirects manager, plus a list of addresses that returned 404 so the owner can add the missing ones.
- **Images.** Several sizes made at upload in the admin's browser, so no paid image service is needed. Then srcset, alt text required on publish, a focal point for crops, and import from a URL with the same address checks the MCP client uses.
- **Edge page cache.** Cache public pages in the Workers Cache API and clear them on publish. Most visits then never touch D1. This is the main step to "faster than WordPress".
- **Admin security.** TOTP and passkeys for staff, a list of active sessions with sign-out, and an option to put `/admin` behind Cloudflare Access (free up to 50 users).

### Phase 2: plugins

- The Content API with scoped tokens.
- Events and webhooks with a delivery log.
- The hooks registry.
- Extensions: the package format, install, update and uninstall, and a first set built from it: case studies, team, FAQ pages, locations, an SEO pack (schema.org, robots per page, Open Graph image per page).
- Apps: registration, scopes the owner approves, signed events, iframe admin screens.

### Phase 3: the rest of WordPress

- **Editorial roles.** Author, editor and contributor, with a review step before publish.
- **Comments.** On posts, with moderation, Turnstile against bots and email alerts.
- **Translations.** The parked i18n module.
- **Forms builder.** The parked forms module, also usable as a block.
- **Backup and export.** A one-click export of all content and media. D1 Time Travel covers database restore on Cloudflare.
- **Site health page.** Version, pending migrations, failed webhooks, email status, storage used.
- **Several sites on one install.** Later, if needed.

## Status on 2026-11-08

All three phases are built and tested, except the items marked below.

| Item                                                    | State                                                                                                                                                                     | Where                                                          |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Block editor, layouts, reusable blocks                  | Built                                                                                                                                                                     | `src/lib/blocks.ts`, `cms/blocks.ts`, Admin -> Reusable blocks |
| Content types and custom fields                         | Built                                                                                                                                                                     | `cms/types.ts`, Admin -> Content types and Content             |
| WordPress import with redirects                         | Built                                                                                                                                                                     | `cms/wordpress.ts`, Admin -> Import                            |
| Redirects and 404 log                                   | Built                                                                                                                                                                     | `redirects.ts`, Admin -> Redirects                             |
| Image sizes, alt text, focal point, import from address | Built                                                                                                                                                                     | Admin -> Media; srcset in `cms/blocks.ts`                      |
| Edge page cache                                         | Built. On pages.dev, Cloudflare caches public pages for 60 seconds (seen live). The versioned Cache API layer got no hits on pages.dev; not tested on a custom domain yet | `hooks.server.ts`                                              |
| Two-step sign-in, passkeys, sessions, Cloudflare Access | Built                                                                                                                                                                     | `auth/two_factor.ts`, `auth/passkeys.ts`, `auth/access.ts`     |
| Content API, scoped tokens                              | Built                                                                                                                                                                     | `plugins/content_api.ts`, `/api/v1`                            |
| Webhooks with retries and a log                         | Built                                                                                                                                                                     | `plugins/events.ts`, Admin -> API & webhooks                   |
| Hooks registry                                          | Built, one hook (`page.head`)                                                                                                                                             | `plugins/hooks.ts`                                             |
| Extensions and a catalogue of six                       | Built                                                                                                                                                                     | `plugins/extensions.ts`, `plugins/catalogue.ts`                |
| Apps with signed requests and iframe screens            | Built                                                                                                                                                                     | `plugins/apps.ts`, Admin -> Apps                               |
| Author and contributor roles, review queue              | Built                                                                                                                                                                     | `cms/editor.ts`, Admin -> Review queue                         |
| Comments with moderation and Turnstile                  | Built                                                                                                                                                                     | `comments.ts`, Admin -> Comments                               |
| Translations                                            | Built for pages, posts and menu labels; content types and the homepage are not translated yet                                                                             | `translations.ts`, Admin -> Translations                       |
| Forms builder and Form block                            | Built                                                                                                                                                                     | Admin -> Forms                                                 |
| Backup and restore                                      | Built; image files are not in the backup                                                                                                                                  | `backup.ts`, Admin -> Backup & export                          |
| Site health                                             | Built                                                                                                                                                                     | Admin -> Site health                                           |
| Several sites on one install                            | Not built                                                                                                                                                                 | Left for later, as planned                                     |
| App code running inside the Worker                      | Not built                                                                                                                                                                 | Needs Worker Loader or Workers for Platforms; see below        |

## Why it can be safer than WordPress

- No uploaded code: extensions are data, and apps run elsewhere.
- No executable uploads: media goes to R2 with its type checked, and nothing there runs.
- Server-side checks: every admin action checks permissions on the server, and every input is validated with zod.
- Keys in Cloudflare secrets, never in the database or settings.
- Locked-down sign-in: a strict CSP, rate limits on sign-in and forms, 2FA from Phase 1, an audit log of every admin change.
- Locked-down hosting: on Cloudflare there is no server, shell or file system to break into, and updates are deploys of reviewed code, not files changed on a live server.

## Not verified

- Dynamic Worker loading: availability and price on the rugan account.
- Workers CPU time for rendering block pages: assumed fine with the page cache, not measured.
- D1 Time Travel retention on the current plan.
