# Security Policy

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub Security Advisories, using the "Report a vulnerability" button on this repository's Security tab. Please don't open a public issue.

We aim to acknowledge reports within 3 business days and to publish a fix before public disclosure.

For vulnerabilities in the upstream template, also report to https://github.com/CriticalMoments/CMSaasStarter/security

## Security model

See [docs/MODULES.md → Security model](docs/MODULES.md#security-model) for how authorization, Row Level Security, CSP, webhook verification and rate limiting fit together. `./supabase/tests/run.sh` asserts the database access rules in CI.
