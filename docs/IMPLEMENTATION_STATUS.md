# Implementation status

Date: 2026-08-30
Runtime: Pozytywka Registration v4
Production branch: `main`
Integration branch: `preview`

## Current product state

Pozytywka Registration v4 is live in Production and accepting registration requests for the 2026/2027 offer.

The system is intentionally a registration request-intake application, not a CRM, payment system or automatic reservation engine. A submitted form does not guarantee a place; Pozytywka verifies availability and confirms participation separately.

Current verified Production state:

- Git SHA: `5d8628f5bf908b304dcfc172c95d2b8a5c1244f6`
- Vercel deployment: `dpl_5zQbApatboZBQp3J2CX63KT4fn1w`
- deployment: `READY`
- `REGISTRATIONS_OPEN=TRUE`
- schema: v4
- season: `2026-2027`
- 3 active locations
- 18 active public offerings
- Production GET: HTTP 200
- post-launch runtime check: no new warning/error/fatal cluster found

## Implemented runtime

- Next.js 16.3.3 App Router
- strict TypeScript
- Zod server validation
- React Hook Form
- shadcn/Radix controls
- international phone input and E.164 storage
- controlled DOB picker
- adult/minor guardian flow
- Google Sheets repositories
- native Google Tables for canonical registration data
- Vercel OIDC/WIF architecture
- PII-safe structured logging
- Resend participant/admin notifications
- durable notification outbox with retry/reconciliation
- secured Production reconciliation cron endpoint
- business duplicate detection
- requestId idempotency guard
- v4 season/offering/group/status model
- operator-first Sheet UX
- `PANEL_OPERATORA` dashboard
- abuse controls and verified Vercel WAF baseline
- Chromium and iPhone WebKit CI coverage

## 2026/2027 offer

Current public catalog contains 18 concrete offerings across three locations:

- Olkusz · Klub Przyjaźń: 9 offerings,
- Bukowno · MOK Bukowno: 8 offerings,
- Bolesław · Centrum Kultury: 1 offering.

Canonical source: `docs/OFFER_CATALOG_2026-2027.md`.

Business clarifications adopted on 2026-08-30:

- when only a start time was supplied, the class duration is 60 minutes,
- `Pląsanie` lasts 30 minutes,
- missing instructors and capacities remain unknown rather than fabricated,
- exact unresolved business inputs remain documented rather than guessed.

The Production Google Sheet and public UI were refreshed consistently. Previous catalog rows remain preserved inactive; historical `ZAPISY` and `POWIADOMIENIA` were not cleared.

## Notification reliability

`POWIADOMIENIA` is a protected technical outbox without participant PII. Each new Registration has two stable jobs: participant confirmation and admin notification.

Implemented safeguards:

- `PENDING`, `SENDING`, `SENT`, `FAILED`, `SKIPPED` lifecycle,
- lease token and lease expiry,
- attempt counter,
- exponential retry backoff,
- stable provider idempotency keys,
- reconciliation of missing/due jobs,
- manual retry for failed jobs,
- health checks in `pnpm diagnostics`,
- safe historical adoption as terminal `SKIPPED`,
- immediate first delivery attempt after successful Registration,
- secured `GET /api/cron/notifications`,
- Production `CRON_SECRET`,
- Vercel Hobby-compatible daily recovery cron.

Google Sheets is not claimed as an exactly-once transactional queue. This limitation remains an explicit post-launch architecture item.

## Launch hardening completed 2026-08-30

PR #81 introduced the launch-critical hardening identified by the audit:

- Next.js / eslint-config-next 16.3.3 security maintenance release,
- `PARTICIPANT_AGE_NOT_ELIGIBLE` returns HTTP 422 instead of false HTTP 500,
- age eligibility edge case for children born after season start fixed and tested,
- immutable Production e-mail logo asset reference,
- reusable Google WIF auth client in warm runtime,
- Google Sheets request timeout,
- Resend request timeout,
- secured notification reconciliation endpoint,
- Production `CRON_SECRET` requirement,
- Hobby-compatible daily cron,
- corrected success/e-mail wording,
- iPhone WebKit CI project and regression coverage.

PR #82 aligned the final registration disclaimer with the request-intake semantics.

Production was closed during the rollout, the exact deployment passed the Production build gate, closed-state smoke and cron unauthorized smoke, then `REGISTRATIONS_OPEN` was set back to `TRUE` as the final controlled data change.

## GitHub governance

An active repository ruleset named `Protect main and preview` now covers exactly:

- `refs/heads/main`
- `refs/heads/preview`

It enforces:

- no branch deletion,
- no force push/non-fast-forward update,
- pull request required,
- required approvals = 0,
- review conversation resolution,
- squash as the only allowed merge method for protected branches,
- required status `check`,
- required status `webkit`,
- strict up-to-date status checks,
- no bypass actors.

Repository-level convenience settings such as auto-merge, automatic head-branch deletion and update-branch remain separate GitHub settings and are tracked as non-blocking repository hygiene.

## Canonical Google Sheets

TEST:

`11-wmT8OCSVinFNjAFE7oHvIYUKnVOBgxmwIgvGgWH-8`

PROD:

`1DRcWvY8xfZDGjJLWOr8Ax1XsyBw4dWU8C6u9WGNvFfM`

Current system contract remains `SYSTEM_SCHEMA_VERSION=4`.

System sheets:

- `MIASTA`
- `SEZONY`
- `OFERTY_ZAJEC`
- `GRUPY`
- `ZAPISY`
- `POWIADOMIENIA`
- `USTAWIENIA`

`PANEL_OPERATORA` is intentionally a normal derived dashboard rather than a native Table.

## Remaining post-launch work

These items are real but are not falsely marked as solved by the launch hotfix:

- broader Google Cloud IAM least-privilege review beyond Sheet ACL,
- physical Android Chrome acceptance,
- physical iPhone Safari acceptance,
- keyboard/focus/200% zoom/visual contrast human acceptance,
- final human legal/safety read-through,
- physical availability/display of the adopted child-protection standards as required by Pozytywka's procedure,
- GitHub security-default review (Dependabot/security scanning/secret scanning where available),
- transactional-core migration planning from Google Sheets to PostgreSQL,
- atomic idempotency and outbox claiming in the future transactional store,
- operational alerting and restore-tested disaster recovery,
- `City` / `Venue` separation,
- one-to-many `GroupSession`,
- append-only registration workflow audit events,
- offering/legal content snapshot/versioning,
- safer handling of operator free-text notes,
- exact business age ranges/capacities where Pozytywka wants stronger automatic availability logic.

Canonical remediation scope: `docs/AUDIT_REMEDIATION_2026-08-30.md`.
