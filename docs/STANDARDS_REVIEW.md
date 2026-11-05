# Standards review

Date: 2026-11-03. Branch: worktree-standards-review (main 73f7c7a plus the npm audit
fixes from worktree-npm-audit-fixes, commit 8995068, merged in first).

Reviewed against the pstack principles read in full for this pass (Boundary
Discipline, Type System Discipline, Model the Domain, Subtract Before You Add, Test
Behavior Not Implementation, Prove It Works) and ub-mode (make it work, make it
right, follow practice), plus the usual security basics: RLS on every table,
server-side validation at every boundary, redirects, CSP and headers, Stripe and
Calendly webhook handling, secrets, HTML sanitising, email templates, error leakage.

Scope read: src/hooks.server.ts, src/lib/**, src/routes/** (every +page.server.ts,
+server.ts and +layout\*.ts, plus the svelte files that render HTML or post forms),
svelte.config.js, supabase/migrations, supabase/seed.sql, supabase/tests,
src/config.ts, docs/ARCHITECTURE.md, the CI workflows and the upstream docs.

Status key: fixed = changed on this branch with a test, open = not changed,
decision = needs a product call before anyone changes it.

## What is already right

Worth stating so nobody "fixes" it: every table has RLS on and no write policy
for anon or authenticated except profiles (self only); roles live in user_roles,
not on profiles; every admin load and action calls requirePermission; privileged
SQL functions are security definer with search_path pinned and revoked from
anon/authenticated (rate_limit_hit, analytics_hit, admin_list_users,
chat_on_message, has_role); Stripe and Calendly webhooks verify signatures before
parsing and are idempotent; markdown is rendered and sanitised once on save with a
strict allow list; CSP has no unsafe-inline for scripts; HSTS, nosniff, referrer
and permissions policies are set in one place; JSON endpoints check same-origin;
auth callback and sign-in use safeNextPath; newsletter tokens are stored hashed
and unsubscribe only acts on POST; media uploads are typed by magic bytes.

## Ranked gaps

### 1. Client IP was taken from headers any client can set (high) - fixed

src/lib/server/security/request.ts preferred cf-connecting-ip, x-real-ip and
x-forwarded-for over the adapter. On any host that is not Cloudflare (adapter-auto
covers Vercel, Netlify, Node and more) a request could send
`cf-connecting-ip: <anything>` and get a fresh rate-limit window per request for the
contact form, newsletter and chat, and write a forged ip into audit_log.
Principle: Boundary Discipline. The adapter already resolves the real address for
its platform (adapter-node via ADDRESS_HEADER, adapter-cloudflare via
cf-connecting-ip, adapter-vercel via x-forwarded-for), so the app must not re-derive
it from raw headers.
Fix: clientIp uses event.getClientAddress() only. Test:
src/lib/server/security/request.test.ts (failed with 9.9.9.9 before the fix).

### 2. handle_new_user was security definer without a pinned search_path (medium) - fixed

supabase/migrations/20240730010101_initial.sql:51-57. Every other definer function
in the repo sets search_path = ''; this one, inherited from the starter, did not,
which is the pattern Supabase's advisor flags as function_search_path_mutable.
Fix: migration 20261103020000_pin_search_path.sql recreates it with
search_path = ''. Test: supabase/tests/rls_test.sql asserts every security definer
function in public pins search_path (it named handle_new_user before the
migration). The rule from the migration header is now a check, not a comment.

### 3. RLS tests did not cover the per-user and server-only tables (medium) - fixed

supabase/tests/rls_test.sql covered published content, chat for the owner, roles,
CRM and analytics_daily. Not covered: profiles (another user's row), subscriptions,
bookings and chat_conversations across users, cms_page_revisions, site_settings,
audit_log, stripe_customers, stripe_events, rate_limits, analytics_referrers,
crm_deals and crm_activities for the editor, the support role, the storage bucket
policies, and the two structural rules the migrations promise (RLS enabled on every
public table, no write policy for API roles except profiles).
Principle: Prove It Works. Fix: a second user and a support user in the fixtures
and assertions for each of these. The stub now grants storage.objects like Supabase
does, so the bucket checks fail for the policy, not for a missing grant.

### 4. Account self-service actions bypassed the zod boundary (medium) - fixed

src/routes/(admin)/account/api/+page.server.ts (upstream code). Every action read
fields with `as string`, hand-rolled the rules (email contains "@", password
length, 50-char limits) and threw a TypeError on a missing field (500 instead of
400). Each action also re-ran safeGetSession (three Supabase round trips) although
hooks.server.ts had already validated the session into locals.user. This file and
src/routes/(admin)/account/(menu)/+page.server.ts both defined a `signout` action
that nothing posts to (sign-out is client side in sign_out/+page.svelte).
Principles: Boundary Discipline, Type System Discipline, Laziness Protocol (one
decision in one place).
Fix: one zod schema per form, parsed once at the top of the action; locals.user
instead of safeGetSession except where amr is needed; passwords are no longer
echoed back in the failure data; dead signout actions removed. Tests:
src/routes/(admin)/account/api/page.server.test.ts (17 cases, 5 failed before).

### 5. Site identity had two sources of truth (medium) - fixed

src/config.ts exported WebsiteName, WebsiteBaseUrl ("https://example.com") and
WebsiteDescription next to the admin-editable brand settings. The only consumer
was the welcome email, so every welcome email linked to example.com unless someone
edited config.ts, while the newsletter email already used event.url.origin and
brand.siteName.
Principle: Model the Domain (one place owns the site name). Fix: the welcome email
uses the request origin and brand.siteName; the three constants are deleted.
Covered by the updateProfile tests.

### 6. Mailer types and logging (medium) - fixed

src/lib/mailer.ts: template_name was a plain string that drove a dynamic import,
the outgoing email was `any` behind an eslint-disable, failures went to
console.log, and sendUserEmail built its own service-role client from the static
env instead of using the request's. Principle: Type System Discipline.
Fix: EmailTemplate union, typed Resend payload, console.error, and sendUserEmail
takes `db`. Covered by src/lib/mailer.test.ts.

### 7. Audit actions were free-form strings (medium) - fixed

src/lib/server/audit.ts took `action: string`; 23 literals were scattered across
routes and the audit page filtered on raw query input. Principle: Model the Domain.
Fix: AUDIT_ACTIONS registry, AuditAction type, isAuditAction for the page filter;
`npm run check` proves every call site uses a listed action.

### 8. Stripe client was built in three places with a static key (medium) - fixed

subscription_helpers.server.ts, billing/manage/+page.server.ts and
subscribe/[slug]/+page.server.ts each did `new Stripe(PRIVATE_STRIPE_API_KEY)` from
$env/static/private at import time, so the build needed a key even with the
subscriptions module off (the CI workflows carried a fake one for this), while the
webhook read $env/dynamic/private. Principle: Laziness Protocol.
Fix: src/lib/server/billing/stripe.ts owns the client and API version; callers get
a logged 500 (portal, checkout) or a 404 (webhook) when the key is missing. The fake
key is gone from .github/workflows. Test: src/lib/server/billing/stripe.test.ts,
plus a build with no PRIVATE_STRIPE_API_KEY in .env.

### 9. Customer portal home read with the service role (low) - fixed

src/routes/(admin)/account/(menu)/+page.server.ts filtered subscriptions, bookings
and chat_conversations by user_id through supabaseServiceRole, while the sibling
pages (bookings, support) read through locals.supabase so RLS is the gate.
Principle: Boundary Discipline (a missing .eq cannot leak). Fix: read through
locals.supabase. Covered by the per-user RLS assertions in gap 3.

### 10. Newsletter one-click unsubscribe was claimed, not implemented (low) - fixed

src/routes/(marketing)/newsletter/unsubscribe/+page.server.ts said the POST "is
also used for RFC 8058 one-click", but no email sets List-Unsubscribe headers and
SvelteKit's CSRF check rejects a cross-origin form POST. Nothing sends newsletters
yet (campaigns is a planned module). Principle: Subtract Before You Add. Fix: the
comment now says what the code does. Implementing one-click belongs with the
campaigns module (see decisions).

### 11. `next` is dropped on sign-up and OAuth sign-in (low) - open

src/lib/server/pricing.ts:15 builds /login/sign_up?next=/account/subscribe/<id>,
but sign_up/+page.svelte never reads next and both login pages pass a redirectTo
without it, so a visitor who picks a plan lands on /account after sign-up. Fix:
append ?next= to redirectTo (safeNextPath already guards the callback). Left open:
the only honest test is a browser test and the project has none.

### 12. profiles and contact_requests have no length limits in the database (low) - open

supabase/migrations/20240730010101_initial.sql:2-9 and 36-46. The newer tables cap
every text column; these two rely on the app. A signed-in user can write any length
into their own profile straight through PostgREST (RLS allows it). Impact is UI
only. Fix: a migration adding check constraints. Left open because it can fail on
existing rows in a deployed database, so it needs an owner to run it.

### 13. Per-instance mutable state for module switches and settings (low) - accepted

src/lib/modules.ts (switches) and src/lib/server/settings.ts (cache) are
module-level values written by the hook on every request and read synchronously
everywhere. On single-threaded runtimes this is fine, and the values come from the
same 30 second cache so concurrent requests see the same thing. Principle: Separate
Before Serializing Shared State. Documented in code; no change.

### 14. Error strings in admin responses (low) - open

src/routes/admin/media/+page.server.ts returns the storage provider's error message
to staff on a failed upload; it is the only place a provider message reaches a
page, and the reader is staff. Not changed.

### 15. Non-ASCII characters in about 60 files (low) - open

Em-dashes, arrows and ellipses in strings, comments and docs (repo convention: ASCII
only). Every file this branch touched is clean; the rest is a sweep for a later
pass so this branch stays reviewable.

## Accepted trade-offs (not gaps)

- CSP img-src allows any https host because editors paste image URLs; connect-src
  allows \*.supabase.co; style-src needs unsafe-inline for Svelte transitions and the
  Supabase auth UI. All three are explained in svelte.config.js.
- Login and account layouts pass cookies.getAll() to the universal load. That is the
  documented Supabase SSR pattern; the cookies belong to the same user.
- Rate limiting fails open on a database error (availability over strictness), said
  in src/lib/server/security/rate_limit.ts.
- Billing pages still ask Stripe for the subscription on every load instead of
  reading the subscriptions mirror, because the mirror only fills once the webhook is
  configured. See decisions.

## CMSaasStarter leftovers that did not earn their place

Removed on this branch, each proven by a grep for importers and the full gate run:

- src/index.test.ts: the create-svelte sample test (1 + 2 = 3).
- src/lib/index.js: the create-svelte placeholder.
- patch-package and the postinstall script: no patches exist since the audit branch.
- fuse.js: nothing imports it; search is SQL ILIKE.
- jsdom and @types/jsdom as direct dependencies: no test uses a DOM; vitest runs in
  node. jsdom still appears in package-lock.json because vitest lists it as an
  optional peer and npm keeps an already-resolved optional peer.
- WebsiteName, WebsiteBaseUrl, WebsiteDescription in src/config.ts (gap 5).
- The two unused signout server actions (gap 4).
- analytics_docs.md: told you to add PostHog or Google Analytics script tags, which
  the CSP blocks and the analytics module replaces. README no longer links it.
- welcome_email_html.hbs footer: "Company Inc, 123 Main St, Toronto, Canada" and the
  "Email Template by HTMLemail.io" credit.
- The fake PRIVATE_STRIPE_API_KEY in the four CI workflows (gap 8).

Kept, listed for a decision (see below): the avatars bucket and profiles.avatar_url,
the CreateProfileStep onboarding (company and website required), the GitHub OAuth
provider, the misspell step in checks.sh and format.yml, docs/MODULES.md,
email_docs.md.

## Decisions needed before changing

- Password change: keep the upstream approach (re-sign-in with the current password
  to verify it) or move to Supabase reauthentication (secure_password_change). The
  upstream approach also refreshes the session cookie as a side effect.
- Subscriptions: billing pages call Stripe on every load; the subscriptions mirror
  exists but is only filled when the webhook secret is set. Pick one source. The
  Stripe SDK is pinned to 13.x with apiVersion 2023-08-16; newer API versions move
  current_period_end onto items, so an upgrade is its own task.
- avatars bucket and profiles.avatar_url: nothing uploads or shows avatars. Dropping
  them is a migration against live data.
- CreateProfileStep: requires company name and website before the account works.
  Right for a B2B SaaS, wrong for most of the catalogue in docs/ARCHITECTURE.md.
- docs/MODULES.md is stale (says five modules, EnabledModules) while ARCHITECTURE.md
  is current; README, SECURITY.md and .env.example still link to MODULES.md. The
  cloud session owns docs on main, so not touched here.
- RFC 8058 one-click unsubscribe: implement with the campaigns module (needs
  List-Unsubscribe headers on outgoing mail and a CSRF-exempt POST route).
- Gap 12 (database length limits on the two starter tables) once there is a
  production database to run the migration against.

## Verification

Gate script (kept outside the repo) runs, from the worktree: npm run check,
npm run lint, npm run format_check, npm run test_run, npm run build, and
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
./supabase/tests/run.sh against the local Supabase Postgres.

Baseline before any change (2026-11-03): all six pass, 12 test files, 50 tests.
After the last commit: all six pass, 13 test files, 69 tests, RLS suite passes.
Also proven: npm run build with PRIVATE_STRIPE_API_KEY removed from .env.

## Log

One line per unit, in commit order.

1. Merged worktree-npm-audit-fixes (8995068) into this branch so the fixed
   dependency set is the base. Reason: the task asked for it when not in main.
2. clientIp from the adapter only. Reason: spoofable headers bypassed rate limits.
   Test failed first with 9.9.9.9, passed after.
3. Pin search_path on handle_new_user. Reason: only definer function without it.
   RLS assertion failed first naming the function, passed after the migration.
4. RLS coverage for every table, role and bucket. Reason: Prove It Works.
5. Account forms through zod, locals.user, dead signout actions removed, welcome
   email on the request origin, config constants deleted. Reason: boundary and one
   source of truth. 5 of 17 new tests failed first.
6. Mailer typed and on the request's client. Reason: Type System Discipline.
7. Audit action registry. Reason: Model the Domain; check proves call sites.
8. One Stripe client at request time, fake CI key removed. Reason: Laziness
   Protocol; build proven without the key.
9. Portal home through the user's client. Reason: RLS as the gate, like siblings.
10. Unsubscribe comment matches the code. Reason: Subtract Before You Add.
11. Leftovers removed (files, packages, README link, email footer). Reason: they
    did not earn their place; grep showed no importers, gates stayed green.
12. This document.
