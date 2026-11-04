# Security Policy

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub Security Advisories, using the "Report a vulnerability" button on this repository's Security tab. Please don't open a public issue.

We aim to acknowledge reports within 3 business days and to publish a fix before public disclosure.

## Security model

See [docs/MODULES.md](docs/MODULES.md#security-model) for how sessions, authorization, CSP, webhook verification and rate limiting fit together. Passwords are hashed with scrypt, sessions are random tokens stored hashed, and every portal and admin query is scoped on the server; `npm run test_run` asserts these rules.
