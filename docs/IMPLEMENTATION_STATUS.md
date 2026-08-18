# Implementation status

Date: 2026-08-18

## Implemented locally

- Next.js App Router frontend shell.
- Dependent city -> offering form.
- Minor/adult guardian rules.
- Client and server validation.
- Stable request IDs and idempotent retry handling.
- Application/domain/infrastructure boundaries.
- Google Sheets REST adapter.
- Vercel OIDC -> Google Workload Identity Federation authentication path.
- Memory repositories for local/E2E development.
- Sheet bootstrap, validation, migration placeholder, diagnostics, TEST seeding and reconciliation scripts.
- PII-safe structured logging contract.
- `RAW` Sheets writes.
- Unit and E2E test suites.
- Repository contract validator, current GitHub Actions CI and Dependabot configuration.
- Production-only privacy placeholder blocking.
- Stored registration parser validation for IDs, source, age, timestamps and schema version.
- Ambiguous Sheets append protection: non-idempotent writes are not retried internally.

## Release blockers

- `pnpm-lock.yaml` has not yet been generated because the current isolated build sandbox cannot resolve the npm registry.
- Exact dependency installation, Next build, ESLint, Prettier, Vitest and Playwright must therefore still run in an online environment.
- Production Google Cloud/Vercel OIDC resources are not configured yet.
- Production spreadsheet, privacy notice and retention policy are not configured yet.

These are explicit blockers. The project must not be presented as production-ready until they are cleared.
