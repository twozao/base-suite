# Base Suite architecture

Base Suite is a **modular business platform**: a small core plus independent modules. You install only what your business needs and switch modules on or off as you grow. It follows the model of suites like Axelor and Odoo, but stays small enough for a one-person business to run on a single SQLite file.

```
+----------------------------------------------------------------------+
| Modules      CMS, Contact, Chat, Booking, Newsletter, Subscriptions,  |
|              CRM, Analytics (planned: Helpdesk, Invoicing, Shop, ...) |
+----------------------------------------------------------------------+
| Core         Auth and roles, Admin portal, Customer portal,          |
|              Settings, Brand/Homepage/Navigation, Media, Audit log,  |
|              Rate limiting, Email, Security headers                  |
+----------------------------------------------------------------------+
| Stack        SvelteKit, Kysely on SQLite (default) or Postgres,      |
|              local disk media, Stripe, Resend, Calendly, any Node    |
|              host (Postgres for serverless hosts)                    |
+----------------------------------------------------------------------+
```

## Data layer

One schema, two engines. `src/lib/server/db/schema.ts` declares every table once as Kysely types; `src/lib/server/db/migrations/` builds them with portable DDL; `src/lib/server/db/index.ts` opens SQLite (better-sqlite3, WAL mode) or Postgres (pg) from `DATABASE_URL` and runs pending migrations on start. The app never notices which engine it is on because the rules below hold on both:

- Ids are UUID strings generated in app code; a few append-only tables (audit log, chat messages, revisions, CRM activities) use integer autoincrement.
- Timestamps are ISO-8601 strings (`2026-11-04T05:13:00.307Z`) on both engines, so comparisons are string comparisons and `nowIso()` is the only clock.
- Booleans are 0/1 integers, JSON (tags, audit meta, settings values) is text parsed by `parseJson` / `parseStringList` at the boundary.
- No engine-only SQL: `containsText(column, q)` does case-insensitive search, `onConflict(...).doUpdateSet(...)` does upserts, transactions wrap multi-row writes. Anything that used to be a database function or trigger (rate limit window, page view counter, chat unread counters, first-user admin) is a TypeScript function with a test.
- The same test suite runs on an in-memory SQLite (`createTestDb()`) and, with `TEST_DATABASE_URL`, on a throwaway Postgres (CI does both).

Adding an engine means adding a Kysely dialect in `index.ts` and a `now` default in the initial migration; MySQL is the obvious next one.

## Auth and sessions

Accounts live in `users` (email, scrypt password hash, verified flag) with a `profiles` row for the customer-facing fields. A session is a random 256-bit token in an httpOnly cookie; only its SHA-256 is stored, so a database read cannot be replayed as a login. Sessions last 30 days and renew past half-life. One-time tokens (email verification, password reset) are hashed the same way and expire in hours. The first account created becomes the admin; later roles are granted in Admin -> Users. Code: `src/lib/server/auth/`.

## Installed vs active

|               | Where it's set                                                   | Effect                                                                                                                                      |
| ------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Installed** | `InstalledModules` in `src/config.ts` (build time)               | Code is compiled in. Uninstalled modules aren't shipped at all.                                                                             |
| **Active**    | **Admin -> Modules** (runtime, saved in `site_settings.modules`) | An active module's routes, admin pages, widgets and integrations are live. An inactive module returns 404 everywhere, and its data is kept. |

A module is active only if it is installed, switched on, and **every module it depends on is active**. Turning a module on also turns on its dependencies. Turning off a module that others depend on is refused, with an explanation.

The `modules` server hook loads the switches on every request (from the 30-second settings cache), so `isModuleEnabled()` is a fast synchronous check anywhere in server code.

## Anatomy of a module

Each module is the same set of parts. The CRM module is shown here as the reference example.

| Part                      | Location                                                 | CRM example                                                    |
| ------------------------- | -------------------------------------------------------- | -------------------------------------------------------------- |
| Manifest                  | `MODULES` in `src/lib/modules.ts`                        | id, name, category, `dependsOn`, `provides`                    |
| Admin navigation          | `ALL_ADMIN_NAV` in `src/lib/modules.ts`                  | "CRM contacts" and "Deals pipeline" in the Customers group     |
| Permissions               | `src/lib/permissions.ts`                                 | `crm.manage` (support and admin roles)                         |
| Database                  | `src/lib/server/db/migrations/` and `schema.ts`          | `crm_contacts`, `crm_deals`, `crm_activities`                  |
| Server logic              | `src/lib/server/<module>.ts`                             | `captureLead()`                                                |
| Admin pages               | `src/routes/admin/<module>/`                             | contacts list, contact detail, deals board                     |
| Public routes and widgets | `src/routes/(marketing)/...`, `src/lib/components/site/` | none for CRM (newsletter adds `/newsletter` and a footer form) |
| Tests                     | `*.test.ts` next to the code, on `createTestDb()`        | `crm.test.ts`: one contact per email, activity per touchpoint  |

### Rules every module follows

1. **Guard every entry point.** Every load, action and endpoint starts with `requireModule("<id>")` and `requirePermission(event, "<perm>")`. Layout loads don't protect form actions.
2. **Security lives on the server.** Every write happens after the permission check; every customer portal read goes through `src/lib/server/portal.ts`, whose functions all take the signed-in user's id, so a page cannot show another user's rows.
3. **Modules talk through small service functions, never through each other's tables.** Contact, Chat, Booking, Newsletter and Billing each call `captureLead()`. If the CRM is off, that call does nothing. This keeps every module optional.
4. **No cost until used.** Public pages stay CDN-cacheable, widgets load lazily, and there are no third-party scripts.
5. **Settings are validated.** Runtime options are zod schemas with defaults in `src/lib/server/settings.ts`, so a bad value falls back to its default instead of breaking the site.

### How the modules connect

```
Contact form --+
Live chat -----+
Booking -------+--> captureLead() --> CRM contact + timeline --> Deals pipeline
Newsletter ----+
Billing -------+  (active subscriber => contact becomes "customer")

Every public page --> /api/pv beacon --> Analytics (counters only)
```

## Module catalogue

### Available

| Module                          | Category  | Depends on | What it adds                                                                    |
| ------------------------------- | --------- | ---------- | ------------------------------------------------------------------------------- |
| Pages & Blog (`cms`)            | Website   | none       | Pages at `/<slug>`, blog with tags, scheduled publishing, RSS, search, sitemap  |
| Contact form (`contact`)        | Engage    | none       | Spam-protected form, inbox with statuses and notes, email alerts                |
| Live chat (`chat`)              | Engage    | none       | Lazy widget, shared support inbox, customer portal conversation                 |
| Online booking (`booking`)      | Engage    | none       | `/book` with Calendly embeds, signed webhook, bookings admin and portal         |
| Newsletter (`newsletter`)       | Engage    | none       | Double opt-in, safe unsubscribe, CSV export                                     |
| Subscriptions (`subscriptions`) | Sell      | none       | Stripe Checkout, billing portal, plans editor, webhook mirror                   |
| CRM (`crm`)                     | Customers | none       | Auto-captured contacts, activity timeline, notes and calls, deals pipeline      |
| Analytics (`analytics`)         | Insights  | none       | Cookie-free page views, top pages and referrers, Do Not Track and GPC respected |

The core is always on: auth and roles, admin and customer portals, homepage, brand and navigation editors, media library, settings and audit log.

### Planned (shown as "Planned" in Admin -> Modules)

| Module           | Category  | Depends on | Scope                                                                                  |
| ---------------- | --------- | ---------- | -------------------------------------------------------------------------------------- |
| Helpdesk         | Customers | crm        | Tickets with SLAs, canned replies, email-in; chats and contact requests become tickets |
| Knowledge base   | Customers | cms        | Help articles, categories, search, "was this helpful?"                                 |
| Invoicing        | Sell      | crm        | Quotes, invoices, PDF, Stripe payment links, reminders                                 |
| Shop             | Sell      | none       | Products, cart, one-off Stripe payments, digital downloads                             |
| Events           | Sell      | none       | Event pages, tickets, capacity, check-in                                               |
| Form builder     | Engage    | none       | Custom forms with a submissions inbox                                                  |
| Email campaigns  | Engage    | newsletter | Compose and send to subscribers, opens and clicks                                      |
| Reviews          | Engage    | crm        | Collect, moderate and publish reviews                                                  |
| Projects & tasks | Operate   | crm        | Client projects, boards, due dates, portal sharing                                     |
| Team & HR        | Operate   | none       | Staff directory, leave, timesheets                                                     |
| Expenses         | Operate   | none       | Expenses with receipts and categories                                                  |
| Multilingual     | Website   | cms        | Translations, per-locale URLs, hreflang                                                |
| Reports          | Insights  | analytics  | Revenue, funnel and support reports across modules                                     |

### Suggested bundles by use case

| Business            | Turn on                                                           |
| ------------------- | ----------------------------------------------------------------- |
| Consultant / agency | CMS, Contact, Booking, CRM, Analytics (later Invoicing, Projects) |
| SaaS product        | CMS, Subscriptions, Chat, Newsletter, Analytics, CRM              |
| Local shop / cafe   | CMS, Contact, Newsletter, Analytics (later Shop, Events, Reviews) |
| Coach / creator     | CMS, Booking, Newsletter, Subscriptions (later Events, Campaigns) |

## Building a module

1. **Register it.**
   - Add `<id>: true` to `InstalledModules` in `src/config.ts`.
   - Add a manifest to `MODULES` in `src/lib/modules.ts`, plus its admin navigation entries.
2. **Permissions.** Add new permissions to `PERMISSIONS` and to the roles that should get them in `src/lib/permissions.ts`.
3. **Database.**
   - Add a migration file under `src/lib/server/db/migrations/` and list it in `migrations/index.ts`; use only portable column types (text, integer, bigint) and checks.
   - Add the table interface to `src/lib/server/db/schema.ts`.
   - Cover the rules with a test on `createTestDb()`.
4. **Server logic.**
   - Put it in `src/lib/server/<id>.ts`.
   - Expose small functions other modules may call, each a no-op when your module is off.
   - Unit-test the pure parts.
5. **Routes.**
   - Admin pages go under `src/routes/admin/<id>/`, public ones under `src/routes/(marketing)/`, APIs under `src/routes/api/`.
   - Every load, action and endpoint calls `requireModule` and `requirePermission`; customer portal reads take the user's id.
6. **Runtime settings (optional).** Add a zod schema with defaults to `settingsSchema`, then an admin form using `saveJsonSetting`.
7. **Verify.** Run `./checks.sh`, and the suite on Postgres if you touched SQL. In **Admin -> Modules**, switch the module off and confirm its routes 404 and its menus disappear.

## Request lifecycle

```
init: open DATABASE_URL (SQLite file by default), run pending migrations
request
  +- securityHeaders  (CSP via svelte.config.js, HSTS, frame/referrer/permissions policies, CDN cache rules)
     +- database      (locals.db, one Kysely handle per process)
        +- modules    (owner's module switches -> isModuleEnabled)
           +- authGuard  (session cookie -> locals.user / locals.session, renewed past half-life)
              +- adminGuard (/admin requires a staff role)
                 +- route: requireModule -> requirePermission -> zod validation -> db -> audit
```
