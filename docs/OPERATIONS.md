# Operations

This file documents the current v2 operating model and the planned v3 operational changes. Do not execute v3 migration procedures until their implementation PR exists and is verified.

## Current diagnostics

```bash
APP_ENV=test DATA_BACKEND=google-sheets pnpm diagnostics
```

For Google it checks schema, catalog, settings and protection/table metadata without printing participant PII.

## Current reconciliation

```bash
APP_ENV=test DATA_BACKEND=google-sheets pnpm registrations:reconcile
```

Current v2 reconciliation is read-only and reports at least:

- duplicate `REQUEST_ID`,
- duplicate `REGISTRATION_ID`,
- records without technical IDs,
- inconsistent snapshots.

It does not delete data automatically.

v3 reconciliation will later extend this with season/group/status validation and business duplicate candidates while remaining PII-safe in console output.

## Fresh TEST Sheet

```bash
APP_ENV=test DATA_BACKEND=google-sheets pnpm sheet:bootstrap
APP_ENV=test DATA_BACKEND=google-sheets ALLOW_TEST_SEED=true pnpm seed:test
APP_ENV=test DATA_BACKEND=google-sheets pnpm sheet:validate
```

`sheet:bootstrap` is non-destructive. It prepares the current system structure, native `ZAPISY` table metadata and warning-only protection of technical columns while leaving operator columns intentionally editable.

`seed:test` must not erase `ZAPISY` silently.

## Native registration append

Current v2 no longer uses the old `values.append` path for registrations.

`ZAPISY` is a native Google Sheets Table named `Rejestracje`. New registration rows are appended to the table body with `AppendCellsRequest`, using both the stable `tableId` and the corresponding `sheetId` resolved from spreadsheet metadata.

The Google client must not automatically retry an ambiguous non-idempotent append.

If persistence outcome is ambiguous, retry of the complete registration uses the same `requestId`; the backend first reads for that request before attempting another create.

## Real Google Sheets integration smoke

Run only on TEST:

```bash
APP_ENV=test \
DATA_BACKEND=google-sheets \
ALLOW_TEST_SEED=true \
pnpm test:integration:sheets
```

The integration test must be hard-blocked outside `APP_ENV=test` and must clean its own synthetic row in `finally`.

Normal routine tests must not use real participant contact details.

## Current schema migrations

`SYSTEM_SCHEMA_VERSION` in `USTAWIENIA` is the source of truth for spreadsheet structure.

```bash
pnpm sheet:migrate
```

Current implemented target is schema v2, including the v1 -> v2 DOB/native-table migration.

Do not describe current runtime as schema v1.

Unknown older/newer versions must fail closed rather than mutate data blindly.

## Planned v3 migration

Target after the dedicated migration PR:

```text
SYSTEM_SCHEMA_VERSION=3
REGISTRATION_SCHEMA_VERSION=3
```

Before any v2 -> v3 migration on TEST:

1. verify the spreadsheet is TEST,
2. set `REGISTRATIONS_OPEN=FALSE`,
3. create a complete backup,
4. run `sheet:validate`, `diagnostics` and reconciliation,
5. record native table metadata,
6. confirm no uncontrolled public QA is happening.

The v3 migration is expected to:

1. create `SEZONY` if missing,
2. create `GRUPY` if missing,
3. extend `OFERTY_ZAJEC`,
4. extend `ZAPISY`,
5. update native table range/column metadata,
6. replace status dropdown values,
7. update protection/editable sets,
8. add `CURRENT_SEASON_ID`,
9. set schema version 3 only after previous operations succeed,
10. leave unknown historical values empty.

Migration must be idempotent and non-destructive.

Rollback is restore from the pre-migration backup unless a reverse migration is actually implemented and tested.

## TEST hygiene

Normal operational rule for TEST:

```text
REGISTRATIONS_OPEN=FALSE
```

when TEST is not under an active controlled QA session.

Before v3 schema work:

1. create a backup,
2. close registrations,
3. remove real/manual PII test rows,
4. retain clearly synthetic fixtures only.

Never write v3 development/test data to PROD.

## Canonical preview verification

Before asking anyone to QA the product, verify:

```text
GitHub preview HEAD == canonical Vercel preview deployment git SHA
```

The canonical QA URL is the stable preview alias, not an ephemeral feature deployment.

Do not claim a change is deployed merely because it exists in GitHub.

## Vercel branch deployments

`vercel.json` intends to deploy only `preview` and `main` through `git.deploymentEnabled`.

Because unwanted feature deployments have still been observed, the actual Vercel project behavior must be diagnosed in the dedicated hygiene/preview PR.

Do not use repeated no-op commits as the normal strategy for rate-limit recovery.

## Business duplicate operations, planned v3

`requestId` remains transport idempotency.

v3 will add server-side business duplicate lookup before create:

- exact active duplicate: no new row,
- probable duplicate with changed contact: create and flag `POSSIBLE_DUPLICATE_OF`,
- different offering/season: valid new request.

The public API must not expose a standalone endpoint for probing whether a named child exists in the system.

Google Sheets does not provide hard atomic uniqueness. Reconciliation will detect candidates that pass through due to a concurrency race.

## Operator status semantics, planned v3

Target values:

```text
NEW
IN_REVIEW
CONTACTED
WAITLISTED
CONFIRMED
REJECTED
CANCELLED
```

`CONFIRMED` means the request has been reviewed/contacted and a concrete participation arrangement is confirmed. Later attendance/resignation is not tracked by this application.

`NOTES` is for information necessary to handle the request. Operators must not use it as an uncontrolled store for diagnoses, health information or other sensitive data.

## `UPDATED_AT`

Current `UPDATED_AT` should be understood as an application/system-write timestamp. Manual edits in Google Sheets do not necessarily update it.

v3 introduces explicit workflow timestamps such as `CONTACTED_AT` and `CONFIRMED_AT` instead of pretending every manual edit updates an audit timestamp.

Do not add a hidden/unversioned Apps Script during the schema migration just to mutate timestamps.

## PROD operating rule

Before production smoke:

- `REGISTRATIONS_OPEN=FALSE`,
- separate PROD service account,
- PROD Sheet accessible to PROD identity and approved operators only,
- Preview identity cannot access PROD,
- complete privacy configuration,
- approved retention process,
- approved processor/access inventory,
- child-protection organizational gates recorded,
- complete Vercel Production env,
- production Resend sender ready,
- `sheet:validate` and `diagnostics` green.

`REGISTRATIONS_OPEN=TRUE` is the final operation after the release checklist is fully green.

See `docs/REGISTRATION_V3_PLAN.md` for the staged PR roadmap.
