# Implementation status

Date: 2026-08-19

## Current runtime generation

The currently implemented application is **schema v2**.

The v3 product/domain plan is approved as the next target. v3 runtime/schema changes are not yet implemented.

## Verified architecture

Current Preview/TEST architecture:

```text
Browser
-> canonical Vercel Preview
-> Next.js App Router
-> Vercel OIDC
-> Google Workload Identity Federation
-> TEST service account
-> TEST Google Sheet read/write
-> native Google Sheets Table `Rejestracje`
-> Resend participant/admin notifications
```

TEST and PROD remain separated at spreadsheet/identity level.

## Implemented v2 product/runtime

- Next.js App Router frontend and API.
- Mobile-first public Pozytywka registration form.
- shadcn/Radix form foundation and visible controls.
- shadcn Select for city/offering and phone-country selection.
- International phone formatting with country flags and E.164 canonical storage.
- Samsung-oriented phone/input hardening.
- Full date-of-birth input with shadcn/Radix popover/calendar.
- `BIRTH_DATE` source value and `AGE_AT_SUBMISSION` historical snapshot.
- Minor/adult guardian flow with guardian data cleared when participant becomes adult.
- Name/email whitespace hygiene and server-side normalization.
- Client and server validation.
- Server revalidation of current city/offering at submit.
- Stable request IDs and same-request transport idempotency.
- Request ID conflict detection when payload changes after an earlier attempt.
- Application/domain/infrastructure boundaries.
- Google Sheets repository adapter.
- Header-by-name mapping.
- Native Google Sheets Table `Rejestracje` for `ZAPISY`.
- Registration append via `AppendCellsRequest` to native table body with table metadata resolution.
- No automatic retry of ambiguous non-idempotent append.
- Snapshot names for city/offering.
- Schema v1 -> v2 migration preserving old age values without inventing birth dates.
- Native `BIRTH_DATE` date column and native `STATUS` dropdown.
- Warning-only protections for technical columns while `STATUS` and `NOTES` remain operational.
- TEST and PROD spreadsheets separated.
- Vercel OIDC -> Google WIF for Preview.
- TEST service account limited to TEST Sheet and not granted PROD access.
- Memory repositories for local/E2E use.
- Sheet bootstrap, validation, migration, diagnostics, TEST seeding and registration reconciliation.
- Honeypot, minimum form-fill time and API body-size limit.
- PII-safe structured logging.
- Security headers.
- Privacy notice version stored with Registration.
- Production fail-closed without complete privacy configuration.
- Participant confirmation and admin notification through provider-agnostic e-mail layer + Resend.
- E-mail runs only after persistence and does not roll back a successful Registration.
- Transport replay does not send duplicate notifications.
- Unit tests, Playwright E2E, repository contract validation and GitHub Actions CI.
- Desktop/mobile viewport coverage including Samsung-like regression scenarios.
- Real-Google TEST-only integration roundtrip command.
- Exact-pinned dependencies and `pnpm-lock.yaml`.
- Public repository is intentional; secrets, credentials and participant PII stay outside Git.

## Completed v3 preparation

### Product truth

`docs/v3-product-truth` was merged after green Quality gate and Critical E2E.

The repository now contains `docs/REGISTRATION_V3_PLAN.md` and truth docs explicitly distinguish current v2 runtime from target v3.

### TEST hygiene

Before further v3 work:

- TEST registrations were set to `FALSE`,
- a full spreadsheet backup was created,
- manual/real-looking PII rows were removed from `ZAPISY`,
- `ZAPISY` now contains one explicitly synthetic fixture using `example.com`,
- normal TEST policy is synthetic data only.

No PROD data was modified.

### Vercel branch deployments

Root cause of deployment spam was identified.

The previous catch-all:

```json
"*": false
```

did not cover slash branches such as `feat/...`, `fix/...`, `docs/...` under Vercel minimatch behavior, so those unspecified branches defaulted to deployment enabled.

The branch contract is now:

```json
"**": false,
"preview": true,
"main": true
```

`scripts/repo-validate.mjs` protects that configuration.

Multiple commits pushed after the `**` fix produced zero new feature-branch Vercel deployments, confirming the fix behaves as intended.

## Current known v2 product limitations

- No `Season` model.
- No internal `Group` model.
- Offering only contains basic city/name/active/sort information.
- No rolling/windowed intake rules.
- No waitlist-only offering state.
- Statuses remain `NEW`, `IN_PROGRESS`, `ACCEPTED`, `CANCELLED`.
- No business duplicate detection beyond same-`requestId` replay.
- Public success screen is too generic.
- Participant e-mail currently implies contact only if additional information is needed, while the real business process requires contact after review.
- The form still contains a visual stepper-like presentation even though it is one page.
- `ZAPISY` is technically strong but not yet optimized as an operator-first view for Iwona.
- Production privacy notice and retention policy are not finalized.
- Canonical Preview is currently known to be behind the latest GitHub `preview` commit and must be refreshed/verified before the next product QA.

## Approved v3 target

The approved v3 contract is in `docs/REGISTRATION_V3_PLAN.md`.

v3 introduces in staged PRs:

- `Season`,
- internal `Group`,
- richer Offering intake configuration,
- `ROLLING` / `WINDOWED`,
- `OPEN` / `WAITLIST_ONLY` / `CLOSED`,
- workflow statuses `NEW`, `IN_REVIEW`, `CONTACTED`, `WAITLISTED`, `CONFIRMED`, `REJECTED`, `CANCELLED`,
- business duplicate detection separate from `requestId`,
- `POSSIBLE_DUPLICATE_OF`,
- `ASSIGNED_GROUP_ID`,
- `CONTACTED_AT`,
- `CONFIRMED_AT`,
- operator-first Sheets experience,
- corrected public success/mail flow,
- repeat-registration actions,
- privacy/retention/child-protection release gates.

## Immediate implementation sequence

1. `docs/v3-product-truth` - complete.
2. `chore/test-hygiene-and-preview` - current stage.
3. `feat/sheets-schema-v3-foundation`.
4. `feat/offering-intake-rules`.
5. `feat/registration-business-deduplication`.
6. `feat/registration-workflow-statuses`.
7. `feat/operator-sheets-experience`.
8. `feat/registration-copy-and-repeat-flow`.
9. `feat/group-catalog-operations` after real Iwona group data exists.
10. `chore/privacy-retention-readiness`.
11. `feat/abuse-hardening`.
12. `chore/prod-readiness`.

Do not collapse stages into one PR.

## External input still required

From Iwona/business audit:

- verified real city/offering catalog,
- real internal groups,
- age ranges,
- schedules,
- instructors,
- capacities,
- prices,
- payment process,
- contract-conclusion point,
- resignation rules,
- exact theatre window/casting rules,
- contact SLA if any,
- whether guardian relationship is operationally useful,
- confirmed legal/contact details,
- approved retention periods.

Unknown values must not be invented.

## Remaining PROD gates

- approved final catalog,
- approved privacy notice,
- final `PRIVACY_NOTICE_URL` / version,
- approved retention policy and procedure,
- processor/access inventory,
- child-protection standards/personnel verification confirmation recorded,
- final domain,
- final visual/business acceptance,
- separate PROD service account/WIF/access,
- complete Vercel Production env,
- production Resend sender,
- admin mailbox delivery verification,
- manual keyboard/focus/reflow/device QA,
- PROD closed smoke test,
- release checklist fully green before opening registrations.

## Engineering gates

For every normal PR:

```text
pnpm check
pnpm test:e2e
```

For Google-backed PRs, additionally on TEST only:

```text
sheet:validate
diagnostics
test:integration:sheets
```

Do not rely on old hardcoded test-count numbers. Current CI is the source of truth.

## Release statement

v2 remains the working registration runtime. Product truth and environment hygiene are now being aligned before schema v3 starts. PROD remains intentionally fail-closed until product, legal, infrastructure and manual QA gates are complete.
