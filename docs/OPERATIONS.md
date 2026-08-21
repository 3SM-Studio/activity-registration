# Operations

This runbook describes the currently implemented v4 operating model.

Never use development or QA commands against PROD unless the command is explicitly part of the approved closed-production release procedure.

## 1. Normal TEST state

TEST should normally remain:

```text
REGISTRATIONS_OPEN=FALSE
```

Open TEST only for a controlled QA session and close it afterwards.

Routine TEST data must be clearly synthetic. Do not copy participant rows from PROD into TEST and do not use real participant mailboxes for normal QA.

## 2. Canonical Preview

The only full Vercel Preview TEST is the `preview` branch.

Before product QA verify:

```text
GitHub preview HEAD == canonical Vercel Preview deployment git SHA
```

Then verify the stable Preview alias actually renders the current application and reads the TEST catalog.

Do not infer deployment success only from GitHub merge state.

Feature branches are disabled through `vercel.json` using:

```json
"**": false,
"preview": true,
"main": true
```

`scripts/repo-validate.mjs` guards that contract.

## 3. Current schema

Current implemented target:

```text
SYSTEM_SCHEMA_VERSION=4
```

System sheets:

```text
MIASTA
SEZONY
OFERTY_ZAJEC
GRUPY
ZAPISY
USTAWIENIA
```

`ZAPISY` remains the native table `Rejestracje`.

`PANEL_OPERATORA` is intentionally a normal dashboard sheet, not a native Google Table. It contains derived formulas/KPIs and a hidden helper column for group IDs; participant records remain canonical only in `ZAPISY`.

Historical rows may retain fields introduced by later schema versions as empty. Never fabricate DOB, season, group or workflow timestamps.

## 4. Sheet validation

Read-only structural validation:

```bash
APP_ENV=test DATA_BACKEND=google-sheets pnpm sheet:validate
```

Diagnostics:

```bash
APP_ENV=test DATA_BACKEND=google-sheets pnpm diagnostics
```

Diagnostics validate schema/catalog/settings/table metadata and workflow constraints without printing participant PII.

## 5. Reconciliation

```bash
APP_ENV=test DATA_BACKEND=google-sheets pnpm registrations:reconcile
```

Current reconciliation remains non-destructive and PII-safe. It can report technical/data-integrity problems including:

- duplicate `REQUEST_ID`,
- duplicate `REGISTRATION_ID`,
- missing technical IDs,
- invalid season/offering/city references,
- invalid assigned-group references where applicable,
- business duplicate candidates,
- exact active duplicate pairs,
- workflow-status violations,
- invalid/future birth dates,
- detectable workflow timestamp sequencing problems.

Use row numbers and technical identifiers for investigation rather than logging names, e-mails or phone numbers.

## 6. Real Google integration

TEST only:

```bash
APP_ENV=test \
DATA_BACKEND=google-sheets \
ALLOW_TEST_SEED=true \
pnpm test:integration:sheets
```

The command must remain hard-blocked outside TEST and must clean its own synthetic test row in `finally`.

For a Google-backed release change the required evidence is:

```text
sheet:validate
+ diagnostics
+ dedicated real-Google integration
```

in addition to normal repository CI.

## 7. Runtime bootstrap vs structural schema sync

There are now two intentionally different maintenance paths.

### Routine operator refresh

```bash
APP_ENV=test DATA_BACKEND=google-sheets pnpm sheet:bootstrap
```

`sheet:bootstrap` is the runtime-safe path. It may refresh operator presentation, filter views and warning conditional formats in `ZAPISY`, and it removes legacy whole-cell `STATUS` conditional formats. It must not create/update native Tables, Table `columnProperties`, supporting-table schema or protections.

Use this path during normal operation when a presentation refresh is actually needed. Ordinary status/date edits do not require running any bootstrap because `PANEL_OPERATORA` formulas recalculate from `ZAPISY` automatically.

### Structural schema maintenance

```bash
APP_ENV=test DATA_BACKEND=google-sheets pnpm sheet:schema-sync
```

`sheet:schema-sync` is the explicit structural path. It may create/update native Tables, refresh Table ranges/row properties, update `ASSIGNED_GROUP_ID` dropdown values, refresh protections and rebuild the operator dashboard structure.

Do not run `sheet:schema-sync` while an operator is actively editing the Sheet UI or configuring native dropdown presentation. For PROD, treat it as a controlled maintenance operation with intake closed and no concurrent operator edits.

For a fresh TEST sheet:

```bash
APP_ENV=test DATA_BACKEND=google-sheets pnpm sheet:schema-sync
APP_ENV=test DATA_BACKEND=google-sheets ALLOW_TEST_SEED=true pnpm seed:test
APP_ENV=test DATA_BACKEND=google-sheets pnpm sheet:validate
```

`seed:test` and `seed:production-catalog` intentionally finish through the structural schema-sync path because catalog changes can require Table/dropdown metadata changes.

Explicit migration:

```bash
pnpm sheet:migrate
```

The migration path supports historical versions through v4. It must be idempotent, fail closed on unknown/partial unsafe structures and set the system version only after the required structural work succeeds.

Before migrating or structurally syncing any important spreadsheet:

1. confirm the spreadsheet/environment explicitly,
2. set `REGISTRATIONS_OPEN=FALSE`,
3. create a complete backup,
4. ensure no operator is actively editing the spreadsheet,
5. run current validation, diagnostics and reconciliation,
6. record native table metadata,
7. ensure no uncontrolled users are submitting,
8. migrate/sync,
9. rerun validation/diagnostics/integration.

Rollback is restore from the pre-migration backup unless a tested reverse migration exists.

## 8. Native registration writes

Registrations are appended to native table `Rejestracje` through `AppendCellsRequest` using resolved table/sheet metadata.

The Google client does not blindly retry ambiguous non-idempotent append operations.

If a write outcome is uncertain, retry the whole registration with the same `requestId`; the application first checks whether that logical request already exists.

## 9. Business duplicate operations

`requestId` protects transport replay.

Separately, the current registration flow performs business duplicate detection before create:

- exact active duplicate with matching contact: no new row,
- probable duplicate with changed contact: new row with `POSSIBLE_DUPLICATE_OF`,
- different offering or season: valid independent request,
- previous `REJECTED`/`CANCELLED`: may be submitted again.

Google Sheets does not give hard atomic uniqueness. Use reconciliation for race-condition candidates. If hard uniqueness becomes required, review storage rather than pretending Sheets provides a database constraint.

## 10. Operator workflow

Current status values:

```text
NEW
IN_REVIEW
CONTACTED
WAITLISTED
CONFIRMED
REJECTED
CANCELLED
```

The operator workflow keeps one canonical native table in `ZAPISY` and a separate read-only-style dashboard in `PANEL_OPERATORA`.

Operator-managed fields include:

```text
STATUS
ASSIGNED_GROUP_ID
CONTACTED_AT
CONFIRMED_AT
CLOSED_AT
NOTES
```

`STATUS` is a native Google Table dropdown. Native dropdown option/chip colors are UI-owned because the public Sheets API does not expose per-option chip colors. Do not emulate status chips with whole-cell conditional formatting. Code-managed conditional formatting is reserved for actionable warnings such as missing workflow dates, missing confirmed group or duplicate review.

`NOTES` is for information necessary to process the registration. Do not turn it into an uncontrolled health/family/special-category data store.

`UPDATED_AT` is an application/system-write timestamp. Direct manual Sheet edits do not guarantee it changes.

## 11. Group catalog

The `GRUPY` schema is active, but real group rows must come from Iwona's verified data.

Do not fabricate:

- group names,
- age ranges,
- schedules,
- venues,
- instructors,
- capacities.

`ASSIGNED_GROUP_ID` is a native dropdown derived from active groups for `CURRENT_SEASON_ID`. When that active set changes, run the explicit `sheet:schema-sync` maintenance path rather than rewriting Table metadata during routine operator work.

## 12. Abuse protection

Application-level controls:

- JSON-only API,
- body-size limit,
- honeypot,
- minimum fill time,
- server validation,
- PII-safe logging.

Before public PROD opening, the Vercel WAF rate-limit rule defined in `docs/ABUSE_PROTECTION.md` must be configured and verified with registrations closed.

Do not load-test PROD by creating registration rows.

Turnstile remains an escalation only if real abuse shows WAF + current heuristics are insufficient.

## 13. Production environment preflight

After configuring Production environment variables, run with the same intended values:

```bash
pnpm prod:env:validate
```

The preflight fails without:

- `APP_ENV=production`,
- `DATA_BACKEND=google-sheets`,
- PROD spreadsheet ID,
- complete WIF identifiers,
- `EMAIL_PROVIDER=resend`,
- Resend API key,
- production sender,
- final admin recipient list,
- `ALLOW_TEST_SEED=false`.

It reports only configuration presence/counts, not secret values.

Passing this command does **not** prove the external service account, IAM binding, Sheet permissions or sender domain are correct. Those require the closed production verification below.

## 14. Closed production verification

Do not open intake yet.

Required order:

1. create/confirm separate PROD Sheet,
2. migrate/sync PROD to schema v4 with a backup and `REGISTRATIONS_OPEN=FALSE`,
3. create/confirm separate PROD service account,
4. bind only the Production Vercel subject to the PROD identity,
5. verify Preview identity cannot write/read PROD resources beyond explicitly approved access,
6. review PROD Sheet sharing for approved humans + PROD service account only,
7. configure production Resend sender and final admin recipients,
8. run `pnpm prod:env:validate`,
9. run PROD `sheet:validate`,
10. run PROD `diagnostics`,
11. verify the privacy settings/legal page are final,
12. configure and test the Vercel WAF rule while registrations are closed,
13. render the production form and confirm closed-state UX,
14. perform only the specifically approved closed-production smoke actions,
15. run manual keyboard/focus/reflow/device QA,
16. record release evidence in `docs/RELEASE_CHECKLIST.md`.

Do not seed TEST fixtures into PROD.

## 15. Final opening operation

Only when every blocking release item is complete:

```text
REGISTRATIONS_OPEN=TRUE
```

After opening, perform a minimal controlled real-path verification without creating unnecessary participant data, confirm participant/admin e-mail delivery and monitor errors/WAF activity without logging PII.

## 16. External gates

Engineering cannot truthfully close these without approved business/legal/operational input:

- real group catalog,
- exact theatre-specific rules,
- final controller/contact data,
- final privacy notice/legal bases,
- retention criteria,
- approved access list,
- child-protection evidence,
- paid-contract/resignation process where relevant,
- final Production sender/admin mailbox,
- physical-device acceptance.

See `docs/PRIVACY_AND_ORGANIZATIONAL_READINESS.md` and `docs/RELEASE_CHECKLIST.md`.
