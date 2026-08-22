# Implementation status

Date: 2026-08-22
Runtime: Pozytywka Registration v4
Integration branch: `preview`

## Current product state

The v4 software core and production business/legal baseline are implemented. Production is deployed but intentionally fail-closed until the remaining physical/manual release gates are completed.

The system remains a focused registration request intake application, not a full CRM, payment system or attendance platform.

## Implemented runtime

- Next.js App Router
- strict TypeScript
- Zod server validation
- React Hook Form
- shadcn/Radix controls
- international phone input and E.164 storage
- full DOB picker
- adult/minor guardian flow
- Google Sheets repositories
- native Google Tables for canonical registration data
- Vercel OIDC/WIF architecture
- PII-safe structured logging
- Resend participant/admin notifications
- durable notification outbox with retry/reconciliation
- business duplicate detection
- requestId idempotency
- v4 season/offering/group/status model
- operator-first Sheet UX
- `PANEL_OPERATORA` dashboard
- repeat child/activity flows
- abuse controls and verified Vercel WAF baseline

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
- safe adoption of pre-outbox registrations as terminal `SKIPPED` jobs.

Google Sheets is not a transactional queue, so this is not claimed as mathematical exactly-once delivery. Application leases plus stable provider idempotency keys provide the duplicate-send safeguards appropriate to the current architecture.

Canonical design/runbook: `docs/NOTIFICATION_OUTBOX.md`.

## Production business and legal baseline

Adopted and implemented:

- season 2026/2027,
- Olkusz production city baseline,
- six public Offerings,
- eight initial internal Groups,
- theatre window baseline,
- contact/status semantics,
- contract/payment boundary,
- controller/contact baseline,
- public privacy notice,
- GDPR purpose/legal-basis model,
- finite status-based retention,
- data-subject request process,
- production access model,
- NOTES minimization policy,
- Standardy Ochrony Małoletnich v1.1 and child-friendly shortened version.

Canonical sources:

- `docs/PRODUCTION_DECISIONS_2026-08-20.md`
- `docs/RODO_AND_RETENTION_POLICY.md`
- `docs/STANDARDY_OCHRONY_MALOLETNICH.md`
- `docs/STANDARDY_OCHRONY_MALOLETNICH_SKROT.md`

## Canonical Google Sheets

TEST:

`11-wmT8OCSVinFNjAFE7oHvIYUKnVOBgxmwIgvGgWH-8`

PROD:

`1DRcWvY8xfZDGjJLWOr8Ax1XsyBw4dWU8C6u9WGNvFfM`

Current system contract remains `SYSTEM_SCHEMA_VERSION=4`. The notification outbox is an additive system sheet and does not change the `ZAPISY` row schema version.

System sheets:

- `MIASTA`
- `SEZONY`
- `OFERTY_ZAJEC`
- `GRUPY`
- `ZAPISY`
- `POWIADOMIENIA`
- `USTAWIENIA`

`PANEL_OPERATORA` is intentionally a normal derived dashboard rather than a native Table.

## Verified state on 2026-08-22

- TEST returned to `REGISTRATIONS_OPEN=FALSE` after QA.
- TEST outbox was adopted while closed.
- four historical TEST registrations have exactly eight terminal `SKIPPED` jobs, with no historical mail resend.
- PROD remains `REGISTRATIONS_OPEN=FALSE`.
- PROD uses the canonical v4 Sheet and dedicated production service account.
- TEST service account is absent from the PROD Sheet ACL.
- PROD `ZAPISY` has five actionable warning conditional-format rules and no legacy whole-cell STATUS color rules.
- PR #51 durable outbox passed repository quality gate, Chrome verification and Critical E2E before merge to `preview`.
- PR #52 clarified the public source-visible, non-open-source licensing policy and passed CI before merge to `preview`.

## Remaining release blockers

Engineering should not fabricate completion of these items:

1. physically display both adopted Standardy versions in the Pozytywka premises,
2. physical Android Chrome acceptance,
3. physical iPhone Safari acceptance,
4. keyboard/focus/200% zoom/visual contrast human acceptance,
5. final human read-through of public legal/safety documents,
6. broader Google Cloud IAM least-privilege review beyond the Sheet ACL,
7. GitHub repository ruleset/branch-protection configuration through an account with the required admin capability.

Production must stay closed until the blocking release checklist is complete.

Current detailed evidence: `docs/RELEASE_CHECKLIST.md`.
