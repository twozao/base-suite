# Base Suite architecture

Base Suite is a **modular business platform**: a small core plus independent modules. You install only what your business needs and switch modules on or off as you grow. It follows the model of suites like Axelor and Odoo, but stays small enough for a one-person business to run on free hosting tiers.

```
┌──────────────────────────────────────────────────────────────────────┐
│ Modules      CMS · Contact · Chat · Booking · Newsletter ·          │
│              Subscriptions · CRM · Analytics · (planned: Helpdesk,  │
│              Invoicing, Shop, Events, Projects, …)                  │
├──────────────────────────────────────────────────────────────────────┤
│ Core         Auth & roles · Admin portal · Customer portal ·        │
│              Settings · Brand/Homepage/Navigation · Media ·         │
│              Audit log · Rate limiting · Email · Security headers   │
├──────────────────────────────────────────────────────────────────────┤
│ Stack        SvelteKit · Supabase (Postgres + Auth + Storage) ·     │
│              Stripe · Resend · Calendly · any edge/Node host        │
└──────────────────────────────────────────────────────────────────────┘
```

## Installed vs active

|               | Where it's set                                                  | Effect                                                                                                                                      |
| ------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Installed** | `InstalledModules` in `src/config.ts` (build time)              | Code is compiled in. Uninstalled modules aren't shipped at all.                                                                             |
| **Active**    | **Admin → Modules** (runtime, saved in `site_settings.modules`) | An active module's routes, admin pages, widgets and integrations are live. An inactive module returns 404 everywhere, and its data is kept. |

A module is active only if it is installed, switched on, and **every module it depends on is active**. Turning a module on also turns on its dependencies. Turning off a module that others depend on is refused, with an explanation.

The `modules` server hook loads the switches on every request (from the 30-second settings cache), so `isModuleEnabled()` is a fast synchronous check anywhere in server code.

## Anatomy of a module

Each module is the same set of parts. The CRM module is shown here as the reference example.

| Part                      | Location                                                    | CRM example                                                               |
| ------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------- |
| Manifest                  | `MODULES` in `src/lib/modules.ts`                           | id, name, category, `dependsOn`, `provides`                               |
| Admin navigation          | `ALL_ADMIN_NAV` in `src/lib/modules.ts`                     | "CRM contacts" and "Deals pipeline" in the Customers group                |
| Permissions               | `src/lib/permissions.ts`                                    | `crm.manage` (support and admin roles)                                    |
| Database                  | `supabase/migrations/<timestamp>_<module>.sql`              | `crm_contacts`, `crm_deals`, `crm_activities`: RLS on, read policies only |
| Types                     | `src/DatabaseDefinitions.ts`                                | `CrmContactRow`, …                                                        |
| Server logic              | `src/lib/server/<module>.ts`                                | `captureLead()`                                                           |
| Admin pages               | `src/routes/admin/<module>/`                                | contacts list, contact detail, deals board                                |
| Public routes and widgets | `src/routes/(marketing)/…`, `src/lib/components/site/`      | none for CRM (newsletter adds `/newsletter` and a footer form)            |
| Tests                     | `*.test.ts` next to the code, `supabase/tests/rls_test.sql` | RLS assertions for the CRM tables                                         |

### Rules every module follows

1. **Guard every entry point.** Every load, action and endpoint starts with `requireModule("<id>")` and `requirePermission(event, "<perm>")`. Layout loads don't protect form actions.
2. **Security lives in the database.** RLS is on for every table, end users get read policies at most, and writes go through the server with the service role after the permission check. Privileged SQL functions `revoke … from public, anon, authenticated`.
3. **Modules talk through small service functions, never through each other's tables.** Contact, Chat, Booking, Newsletter and Billing each call `captureLead()`. If the CRM is off, that call does nothing. This keeps every module optional.
4. **No cost until used.** Public pages stay CDN-cacheable, widgets load lazily, and there are no third-party scripts.
5. **Settings are validated.** Runtime options are zod schemas with defaults in `src/lib/server/settings.ts`, so a bad value falls back to its default instead of breaking the site.

### How the modules connect

```
Contact form ─┐
Live chat ────┤
Booking ──────┼──► captureLead() ──► CRM contact + timeline ──► Deals pipeline
Newsletter ───┤
Billing ──────┘ (active subscriber ⇒ contact becomes "customer")

Every public page ──► /api/pv beacon ──► Analytics (counters only)
```

## Module catalogue

### Available

| Module                          | Category  | Depends on | What it adds                                                                        |
| ------------------------------- | --------- | ---------- | ----------------------------------------------------------------------------------- |
| Pages & Blog (`cms`)            | Website   | none       | Pages at `/<slug>`, blog with tags, scheduling, RSS, search and sitemap             |
| Contact form (`contact`)        | Engage    | none       | Spam-protected form, inbox with statuses and notes                                  |
| Live chat (`chat`)              | Engage    | none       | Lazy chat widget, support inbox, customer-portal conversation                       |
| Online booking (`booking`)      | Engage    | none       | `/book` with Calendly embeds, signed webhook, bookings admin and portal             |
| Newsletter (`newsletter`)       | Engage    | none       | Double opt-in, safe unsubscribe (GET shows a button, POST unsubscribes), CSV export |
| Subscriptions (`subscriptions`) | Sell      | none       | Stripe Checkout, billing portal, plans editor, webhook mirror                       |
| CRM (`crm`)                     | Customers | none       | Auto-captured contacts, activity timeline, notes and calls, deals pipeline          |
| Analytics (`analytics`)         | Insights  | none       | Cookie-free page views, top pages and referrers, Do Not Track and GPC respected     |

The core is always on: auth and roles, admin and customer portals, homepage, brand and navigation editors, media library, settings and audit log.

### Planned (shown as "Planned" in Admin → Modules)

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
| Local shop / café   | CMS, Contact, Newsletter, Analytics (later Shop, Events, Reviews) |
| Coach / creator     | CMS, Booking, Newsletter, Subscriptions (later Events, Campaigns) |

## Building a module

1. **Register it.**
   - Add `<id>: true` to `InstalledModules` in `src/config.ts`.
   - Add a manifest to `MODULES` in `src/lib/modules.ts`, plus its admin navigation entries.
2. **Permissions.** Add new permissions to `PERMISSIONS` and to the roles that should get them in `src/lib/permissions.ts`.
3. **Database.**
   - Create `supabase/migrations/<timestamp>_<id>.sql`: tables with RLS on and read policies only.
   - Revoke `public, anon, authenticated` on any privileged functions.
   - Add assertions to `supabase/tests/rls_test.sql` and the row types to `src/DatabaseDefinitions.ts`.
4. **Server logic.**
   - Put it in `src/lib/server/<id>.ts`.
   - Expose small functions other modules may call, each a no-op when your module is off.
   - Unit-test the pure parts.
5. **Routes.**
   - Admin pages go under `src/routes/admin/<id>/`, public ones under `src/routes/(marketing)/`, APIs under `src/routes/api/`.
   - Every load, action and endpoint calls `requireModule` and `requirePermission`.
6. **Runtime settings (optional).** Add a zod schema with defaults to `settingsSchema`, then an admin form using `saveJsonSetting`.
7. **Verify.** Run `./checks.sh` and `./supabase/tests/run.sh`. In **Admin → Modules**, switch the module off and confirm its routes 404 and its menus disappear.

## Request lifecycle

```
request
  └─ securityHeaders  (CSP via svelte.config.js, HSTS, frame/referrer/permissions policies, CDN cache rules)
     └─ supabase       (per-request user client + service client, validated session)
        └─ modules     (owner's module switches → isModuleEnabled)
           └─ authGuard (locals.user / session)
              └─ adminGuard (/admin requires a staff role)
                 └─ route: requireModule → requirePermission → zod validation → DB (RLS) → audit
```
