# Implementation status

Date: 2026-08-20

## Current runtime generation

The implemented application is **schema/runtime v3**.

The old statements that v2 is current and v3 is only a target are obsolete. The executable contract currently has `SYSTEM_SCHEMA_VERSION=3`, `SEZONY`, `GRUPY`, v3 Offering intake fields, v3 Registration fields/statuses and the v3 submission workflow.

The canonical Vercel Preview reads the TEST v3 catalog successfully while TEST registrations remain closed.

## Current TEST architecture

```text
Browser
-> canonical Vercel Preview (`preview` branch)
-> Next.js App Router
-> Vercel OIDC
-> Google Workload Identity Federation
-> TEST service account
-> TEST Google Sheet v3
-> native Google Sheets Table `Rejestracje`
-> Resend participant/admin notifications when a successful controlled submit is allowed
```

TEST and PROD must remain separate at spreadsheet and identity level.

## Implemented product/runtime

### Existing foundations preserved

- Next.js App Router frontend/API.
- strict TypeScript + Zod + React Hook Form.
- shadcn/Radix public form controls.
- international phone input, country flags, country-aware formatting and E.164 storage.
- full date-of-birth picker and server validation.
- minor/adult guardian flow.
- name/e-mail normalization.
- Google Sheets repository adapter and header-by-name mapping.
- native `ZAPISY` table `Rejestracje` and non-retried ambiguous append design.
- Vercel OIDC -> Google WIF for canonical TEST.
- PII-safe logging and security headers.
- typed React Email participant/admin notifications through Resend.
- memory adapters for local/E2E.
- unit, repository, API and Playwright coverage.
- TEST-only real-Google integration command.
- exact-pinned dependencies and repository policy checks.

### v3 schema/domain

Implemented and merged:

- first-class `Season`,
- internal `Group` schema,
- `CURRENT_SEASON_ID`,
- `ROLLING` / `WINDOWED` offering modes,
- `OPEN` / `WAITLIST_ONLY` / `CLOSED` intake configuration,
- public derived `OPEN` / `WAITLIST_ONLY` / `UPCOMING` / `CLOSED` status,
- server-authoritative current-date intake validation,
- `SEASON_ID` / season snapshot on registrations,
- `ASSIGNED_GROUP_ID`,
- `CONTACTED_AT`,
- `CONFIRMED_AT`,
- `POSSIBLE_DUPLICATE_OF`,
- statuses `NEW`, `IN_REVIEW`, `CONTACTED`, `WAITLISTED`, `CONFIRMED`, `REJECTED`, `CANCELLED`,
- v2 -> v3 explicit/idempotent migration support,
- preservation of unknown historical values without fabrication.

### Business duplicate detection

Implemented and merged:

- separate from `requestId` idempotency,
- exact active duplicate successful no-op without second row,
- probable duplicate accepted with `POSSIBLE_DUPLICATE_OF`,
- different offering/season accepted independently,
- rejected/cancelled previous requests can be submitted again,
- conservative legacy handling without guessed DOB,
- reconciliation support and documented Sheets concurrency limitation.

### Public UX / messaging

Implemented and merged:

- one-page sections instead of fake stepper,
- clear mandatory review/contact explanation,
- real DOB purpose copy,
- pre-submit explanation that submission is not place confirmation,
- normal success screen with `Co dalej?`,
- privacy-safe exact-duplicate success screen,
- corrected participant e-mail,
- operator-focused admin e-mail,
- `Zapisz kolejne dziecko`,
- `Zgłoś inne zajęcia`,
- fresh `requestId` for each repeat submission,
- automated keyboard/repeat-flow coverage.

### Operator Sheets UX

Implemented and merged:

- operator-first visible columns,
- technical-column hiding while preserving the canonical table,
- warning-only technical protections,
- editable workflow fields,
- v3 status dropdown/formatting,
- filter views,
- probable-duplicate visual signal,
- group-assignment field prepared.

A real workflow/group-data review with Iwona remains a business acceptance gate, not a missing schema implementation.

### Privacy/organizational readiness

Implementable documentation/workflow contract is merged:

- processing purpose/data categories,
- processor/recipient inventory framework,
- access-control procedure,
- `NOTES` policy,
- retention decision contract,
- data-subject request procedure,
- child-protection release evidence gate,
- TEST PII rule,
- explicit list of decisions engineering must not invent.

Final legal/business decisions remain external blockers.

### Abuse hardening

Implemented code/documentation:

- existing JSON-only/body-limit/honeypot/minimum-fill-time controls retained,
- automated abuse-path E2E,
- PII-safe telemetry contract,
- hosting-layer Vercel WAF rate limiting selected as the primary volume control,
- Turnstile kept as an escalation if real abuse justifies it.

The actual WAF dashboard rule still has to be created and verified before public PROD opening because the available connector does not expose firewall mutation.

## Completed v3 stages

- PR 0 / product truth: merged (#16).
- PR 1 / TEST hygiene + Preview branch hardening: merged (#17).
- PR 2 / Sheets schema v3 foundation: merged (#18).
- PR 3 / Offering intake rules: merged (#20).
- PR 4 / business duplicate detection: merged (#21).
- PR 5 / workflow statuses: merged (#22).
- PR 6 / operator Sheets experience: merged (#23).
- PR 7 / public copy + repeat flow: merged (#25).
- PR 9 / implementable privacy/retention readiness: merged (#26).
- PR 10 / abuse hardening code + decision: merged (#27).

PR #19 was superseded/closed; #24 was a temporary PR and is not a roadmap stage.

## Intentionally blocked stage

### PR 8 / real group catalog operations

The v3 schema exists, but the plan explicitly forbids inventing real Pozytywka groups.

Still required from Iwona for each real group:

- season,
- linked Offering,
- internal name,
- age range,
- day/time,
- venue,
- instructor,
- capacity if tracked.

Until those data exist, `GRUPY` may remain structurally valid without fabricated production rows and `ASSIGNED_GROUP_ID` may remain empty.

## PR 11 / production-readiness engineering

Production-readiness engineering is implemented in PR #28 on `chore/prod-readiness`.

Its source/runbook scope includes:

- production environment preflight without secret output,
- truth-doc synchronization from stale v2 language to current v3,
- final release checklist correction,
- explicit closed-production verification order.

GitHub PR/CI state is the source of truth for whether #28 has passed its merge gate. The external Production gates below remain separate even after the engineering PR is merged.

## External blockers before PROD can open

### Business/catalog

- real city/offering catalog approved for production,
- real group catalog,
- theatre/window/casting rules where applicable,
- contract/payment/resignation facts if they will appear in public process,
- final visual/business acceptance.

### Privacy/legal/organization

- current controller address/contact verified,
- final privacy notice and legal bases approved,
- retention criteria approved,
- named production access list approved,
- Standardy Ochrony Małoletnich evidence recorded,
- personnel verification procedure/evidence confirmed.

### Platform/production

- separate PROD Sheet migrated/validated to v3,
- separate PROD service account,
- Production-only WIF binding,
- PROD Sheet access review,
- complete Vercel Production env,
- production Resend sender and final admin mailbox,
- Vercel WAF rule created and tested,
- closed production smoke,
- physical Samsung Chrome and iPhone Safari checks,
- manual focus/reflow/contrast acceptance.

## Current safe state

- TEST registrations are closed outside controlled QA.
- Live canonical Preview can read the v3 TEST catalog.
- PROD has not been intentionally opened by this v3 work.
- No stage is allowed to set `REGISTRATIONS_OPEN=TRUE` until all blocking release items are closed.

## Engineering gates

For every normal PR:

```text
pnpm check
pnpm test:e2e
```

For Google-backed changes, on TEST only:

```text
sheet:validate
diagnostics
test:integration:sheets
```

Use current CI/run evidence rather than stale fixed test counts.
