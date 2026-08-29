# Implementation status

Date: 2026-08-29
Runtime: Pozytywka Registration v4
Integration branch: `preview`

## Current product state

The v4 software core, durable notification outbox and production business/legal baseline are implemented. Production is deployed and remains intentionally fail-closed while the release checklist and the 2026/2027 offer refresh are verified.

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

## 2026/2027 offer refresh

The repository now contains the current Pozytywka offer as 18 concrete public offerings across three locations:

- Olkusz · Klub Przyjaźń: 9 offerings,
- Bukowno · MOK Bukowno: 8 offerings,
- Bolesław · Centrum Kultury: 1 offering.

Canonical source: `docs/OFFER_CATALOG_2026-2027.md`.

Implementation details:

- the previous broad categories are no longer the target public catalog,
- each declared class is represented as a concrete public Offering,
- each Offering has one corresponding operational Group for the current season,
- old catalog rows are preserved by the refresh operation but deactivated,
- `ZAPISY` and `POWIADOMIENIA` are never cleared by the refresh,
- Production refresh refuses to run unless registrations are closed, the season is `2026-2027` and the exact Production Sheet is selected,
- unconfirmed instructors and capacities remain empty,
- missing end times remain empty,
- SynTeza Street Dance Squad remains one group with both weekly sessions represented in its schedule text.

The code change does not itself open public registrations. `REGISTRATIONS_OPEN` remains a separate release switch.

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
- registration-request rather than automatic-reservation semantics,
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

Current catalog truth is in `docs/OFFER_CATALOG_2026-2027.md`. Earlier catalog details in `docs/PRODUCTION_DECISIONS_2026-08-20.md` are historical where they conflict with the newer catalog document.

Canonical sources:

- `docs/OFFER_CATALOG_2026-2027.md`
- `docs/PRODUCTION_DECISIONS_2026-08-20.md`
- `docs/RODO_AND_RETENTION_POLICY.md`
- `docs/STANDARDY_OCHRONY_MALOLETNICH.md`
- `docs/STANDARDY_OCHRONY_MALOLETNICH_SKROT.md`

## Canonical Google Sheets

TEST:

`11-wmT8OCSVinFNjAFE7oHvIYUKnVOBgxmwIgvGgWH-8`

PROD:

`1DRcWvY8xfZDGjJLWOr8Ax1XsyBw4dWU8C6u9WGNvFfM`

Current system contract remains `SYSTEM_SCHEMA_VERSION=4`. The offer refresh is a data migration inside the existing v4 schema; it does not change the `ZAPISY` row schema version.

System sheets:

- `MIASTA`
- `SEZONY`
- `OFERTY_ZAJEC`
- `GRUPY`
- `ZAPISY`
- `POWIADOMIENIA`
- `USTAWIENIA`

`PANEL_OPERATORA` is intentionally a normal derived dashboard rather than a native Table.

## Verified state through 2026-08-26

- TEST returned to `REGISTRATIONS_OPEN=FALSE` after QA.
- TEST outbox was adopted while closed.
- four historical TEST registrations have exactly eight terminal `SKIPPED` jobs, with no historical mail resend.
- release PR #54 passed full CI and was merged to `main` as `797ad4151a9511daddc3572c438f976b6df2f56b`.
- Vercel Production deployment `dpl_Cw2hmKfx6jKqwDCifjRkbd75ZyLc` reached `READY` for exactly that SHA.
- PROD remains `REGISTRATIONS_OPEN=FALSE` and the public Production page returned HTTP 200 with the closed-state UX after rollout.
- PROD `POWIADOMIENIA` now exists with the exact 13-column runtime contract and hard protection for the dedicated PROD service account.
- one pre-outbox PROD Registration was adopted as exactly two terminal `SKIPPED` jobs, `CONFIRMATION` and `ADMIN`, with `PRE_OUTBOX_REGISTRATION`, zero attempts, no retry schedule, no lease and no `SENT_AT`.
- historical PROD Registration count remained exactly one after adoption.
- no Production warning/error/fatal runtime logs were found for the verified deployment.
- PROD uses the canonical v4 Sheet and dedicated production service account.
- TEST service account is absent from the PROD Sheet ACL.
- PROD `ZAPISY` has five actionable warning conditional-format rules and no legacy whole-cell STATUS color rules.
- PR #70 corrected the validator/runtime mismatch by reading catalog sheets with `UNFORMATTED_VALUE`; full CI passed before merge to `preview`.
- PR #71 promoted the exact validated change to `main` as `01e07a11be2214bbf3fd4380dc2c34b3190ed4ba`; full CI passed.
- Vercel Production deployment `dpl_8eEVcfawVZL3pixSDBdjkrWphcUP` reached `READY` for exactly that SHA.
- the exact Vercel Production build ran `prod:env:validate`, `sheet:validate` and `diagnostics` successfully before the normal Next.js build.

## Offer refresh verification still required

Before the refreshed offer can be opened publicly:

1. run the catalog refresh against TEST while registrations are closed,
2. run `sheet:validate` and `diagnostics`,
3. verify all 3 places and all 18 offerings in the real Preview form,
4. verify age rejection for exact ranges and broad guards,
5. verify SynTeza Street Dance Squad displays as one group with both weekly sessions,
6. confirm the currently unresolved business inputs listed in `docs/OFFER_CATALOG_2026-2027.md`,
7. only after TEST acceptance, run the same guarded refresh against Production,
8. run Production `sheet:validate`, `diagnostics` and closed-state smoke again.

## Remaining release blockers

Do not fabricate completion of these items:

1. broader Google Cloud IAM least-privilege review beyond the Sheet ACL,
2. physically display both adopted Standardy versions in the Pozytywka premises,
3. physical Android Chrome acceptance,
4. physical iPhone Safari acceptance,
5. keyboard/focus/200% zoom/visual contrast human acceptance,
6. final human read-through of public legal/safety documents,
7. GitHub repository ruleset/branch-protection configuration through an account with the required admin capability.

Production must stay closed until the blocking release checklist is complete.

Current detailed evidence: `docs/RELEASE_CHECKLIST.md`.
