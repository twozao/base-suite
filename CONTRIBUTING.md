# Contributing

Thanks for helping. This project aims to be a starter people can trust in production, so every change needs to keep it **secure by default** and **fast by default**.

## Before you open a PR

```sh
./checks.sh                 # format, lint, svelte-check, unit tests
./supabase/tests/run.sh     # migrations + Row Level Security assertions (needs local Postgres)
```

## Rules for new code

- **Authorization:** every admin `load` and every form action calls `requirePermission()`. Layout loads don't protect actions.
- **Database:**
  - New tables enable RLS.
  - Write paths go through the server with the service role, after a permission check.
  - Add assertions to `supabase/tests/rls_test.sql`.
  - Privileged SQL functions `revoke ... from public, anon, authenticated`.
- **Input:** validate with zod on the server and cap every string length. Treat webhook bodies as untrusted until the signature is verified.
- **Output:** never `{@html}` anything that wasn't sanitised server-side.
- **Third parties:** no new third-party `<script>` tags. Prefer iframes or server-side calls, and update the CSP in `svelte.config.js` deliberately.
- **Performance:**
  - Public pages stay prerendered or CDN-cacheable.
  - Anything heavy loads on interaction (see `ChatLauncher.svelte`).
  - Lists paginate on the server.
- **Modules:** new features belong to a module that can be switched off. See [docs/MODULES.md](docs/MODULES.md#adding-a-module).

## Reporting security issues

Please don't open public issues. See [SECURITY.md](SECURITY.md).
