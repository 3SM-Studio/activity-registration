# Implementation status

Date: 2026-08-20
Runtime: Pozytywka Registration v3
Integration branch: `preview`

## Current product state

The v3 software core is implemented. The production business/legal baseline is also now adopted rather than left as TBD.

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
- Google Sheets repository
- native Google Tables
- Vercel OIDC/WIF architecture
- PII-safe structured logging
- Resend participant/admin notifications
- business duplicate detection
- requestId idempotency
- v3 season/offering/group/status model
- operator-first Sheet UX
- semantic status colors
- repeat child/activity flows
- abuse controls and WAF strategy

## Production business baseline

Adopted in `docs/PRODUCTION_DECISIONS_2026-08-20.md`:

- season 2026/2027,
- Olkusz production city baseline,
- six public Offerings,
- eight initial internal Groups,
- theatre window baseline,
- contact/status semantics,
- contract/payment boundary,
- operational contact process.

These values are editable business configuration. They are not hard product constraints.

## Production privacy/legal baseline

Adopted:

- controller/contact baseline,
- public production privacy notice,
- GDPR purpose/legal-basis model,
- documented legitimate-interest balancing assessment,
- finite status-based retention,
- processor/transfer inventory,
- data-subject request process,
- production access model,
- NOTES minimization policy.

Canonical policy: `docs/RODO_AND_RETENTION_POLICY.md`.

## Child protection baseline

Adopted:

- full Standardy Ochrony Małoletnich,
- child-friendly shortened version,
- Iwona Pilarz as process owner,
- Article 21 personnel-verification procedure,
- intervention/reporting/support/documentation rules,
- separation of staff verification and incident records from `ZAPISY`.

Canonical documents:

- `docs/STANDARDY_OCHRONY_MALOLETNICH.md`
- `docs/STANDARDY_OCHRONY_MALOLETNICH_SKROT.md`

## Canonical Production Sheet

Created on 2026-08-20:

`1DRcWvY8xfZDGjJLWOr8Ax1XsyBw4dWU8C6u9WGNvFfM`

Verified state during production-finalization work:

- v3 sheet structure copied with native Tables and formatting,
- inherited TEST registration values removed,
- `ZAPISY` empty,
- production city/season/Offerings/Groups populated,
- `SYSTEM_SCHEMA_VERSION=3`,
- `CURRENT_SEASON_ID=2026-2027`,
- `PRIVACY_NOTICE_VERSION=2026-08-20`,
- `REGISTRATIONS_OPEN=FALSE`.

The catalog is reproducible through the guarded `pnpm seed:production-catalog` command. That command refuses an unexpected Sheet ID and refuses to seed a Production Sheet that already contains registrations.

## TEST

TEST remains the canonical QA environment for Preview. Recent controlled QA proved the real Google submit path and Resend notification path after the locale-date fix.

Manual real-delivery rows created during the current QA cycle must be removed and TEST returned to `REGISTRATIONS_OPEN=FALSE` after final Preview testing.

## Remaining work

No further product/legal invention is required for v3 launch preparation.

The only remaining gates require actual platform execution/evidence:

1. create/use a separate PROD Google service account,
2. bind Production OIDC/WIF only to that identity,
3. grant that identity minimum access to the canonical PROD Sheet,
4. ensure Preview/TEST identity has no PROD access,
5. configure Vercel Production environment,
6. configure a Resend sender on a verified production domain,
7. create/verify the selected Vercel WAF rule,
8. run final Production validate/diagnostics/reconciliation while closed,
9. run closed Production smoke and mail delivery checks,
10. complete physical/manual device/accessibility checks,
11. open registrations only after those checks.

Current detailed evidence checklist: `docs/RELEASE_CHECKLIST.md`.

## Safety rule

Do not set Production `REGISTRATIONS_OPEN=TRUE` merely to make a checklist look complete. It is the final controlled release action after the infrastructure evidence above is real.
