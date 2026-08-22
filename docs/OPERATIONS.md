# Operations

This runbook describes the currently implemented v4 operating model.

Never use development or QA commands against PROD unless the command is explicitly part of the approved closed-production release procedure.

## 1. Normal environment state

TEST should normally remain:

```text
REGISTRATIONS_OPEN=FALSE
```

PROD must remain:

```text
REGISTRATIONS_OPEN=FALSE
```

until every blocking release item is complete.

Open TEST only for a controlled QA session and close it afterwards. Routine TEST data must be clearly synthetic.

## 2. Canonical Preview

The only full Vercel Preview TEST is the `preview` branch.

Before product QA verify:

```text
GitHub preview HEAD == canonical Vercel Preview deployment git SHA
```

Feature branches are disabled through `vercel.json` using the `**: false`, `preview: true`, `main: true` contract guarded by `scripts/repo-validate.mjs`.

Do not infer deployment success only from GitHub merge state. Vercel must report the exact SHA as `READY`.

## 3. Current Sheet contract

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
POWIADOMIENIA
USTAWIENIA
```

`ZAPISY` is the native Table `Rejestracje`.

`POWIADOMIENIA` is a protected technical notification outbox without participant PII columns.

`PANEL_OPERATORA` is intentionally a normal derived dashboard, not a native Google Table.

Historical registration rows may retain older row-level schema versions. Never fabricate missing historical values merely to normalize version numbers.

## 4. Sheet validation

Read-only structural validation:

```bash
APP_ENV=test DATA_BACKEND=google-sheets pnpm sheet:validate
```

Diagnostics:

```bash
APP_ENV=test DATA_BACKEND=google-sheets pnpm diagnostics
```

Diagnostics validate schema/catalog/settings/table metadata, workflow constraints and notification-outbox health without printing participant PII.

An unhealthy outbox includes:

- missing confirmation/admin jobs,
- `FAILED` jobs,
- `SENDING` jobs with expired leases.

## 5. Registration reconciliation

```bash
APP_ENV=test DATA_BACKEND=google-sheets pnpm registrations:reconcile
```

Registration reconciliation remains non-destructive and PII-safe. Investigate by technical identifiers and row numbers rather than logging participant names, e-mails or phone numbers.

## 6. Notification outbox

Normal reconcile:

```bash
pnpm notifications:reconcile
```

Manual retry of `FAILED` jobs:

```bash
pnpm notifications:retry
```

The outbox uses:

```text
PENDING
SENDING
SENT
FAILED
SKIPPED
```

A job is claimed with a lease before send. Provider idempotency keys use stable Registration-based identifiers. Do not claim strict distributed exactly-once semantics from Google Sheets; lease verification plus provider idempotency are the current duplicate-send safeguards.

### One-time adoption

For an existing environment being upgraded from pre-outbox runtime:

```bash
pnpm notifications:adopt
```

Rules:

1. `REGISTRATIONS_OPEN` must be false,
2. `POWIADOMIENIA` must already exist with the canonical headers,
3. adoption must run only once,
4. the command refuses adoption when the outbox already contains jobs,
5. historical Registration jobs become terminal `SKIPPED`,
6. adoption must never send historical mail.

See `docs/NOTIFICATION_OUTBOX.md`.

## 7. Real Google integration

TEST only:

```bash
APP_ENV=test \
DATA_BACKEND=google-sheets \
ALLOW_TEST_SEED=true \
pnpm test:integration:sheets
```

The command must remain hard-blocked outside TEST and use synthetic data only.

For a Google-backed release change, normal repository CI is supplemented by the appropriate Sheet validation, diagnostics and controlled integration evidence.

## 8. Runtime bootstrap vs structural schema sync

### Routine operator refresh

```bash
APP_ENV=test DATA_BACKEND=google-sheets pnpm sheet:bootstrap
```

`sheet:bootstrap` is runtime-safe. It may refresh operator presentation/filter views/warning conditional formats, but it must not create/update native Tables, Table column schema or protections.

Ordinary operator status/date edits do not require bootstrap because `PANEL_OPERATORA` formulas recalculate from `ZAPISY`.

### Structural schema maintenance

```bash
APP_ENV=test DATA_BACKEND=google-sheets pnpm sheet:schema-sync
```

`sheet:schema-sync` is the explicit structural path. It may update Table metadata, supporting schema, group dropdowns, protections and dashboard structure, including notification-outbox protection.

Do not run structural sync while an operator is actively editing structural Sheet metadata. For PROD, intake must be closed first.

Before important structural maintenance:

1. confirm environment and spreadsheet ID,
2. verify `REGISTRATIONS_OPEN=FALSE`,
3. ensure no concurrent operator structural edits,
4. capture appropriate backup/evidence for the risk level,
5. run validation/diagnostics,
6. perform the structural change,
7. rerun validation/diagnostics and required integration checks.

## 9. Native registration writes

Registrations are appended to native table `Rejestracje` through `AppendCellsRequest` using resolved table/sheet metadata.

The Google client does not blindly retry ambiguous non-idempotent append operations.

If write outcome is uncertain, retry the whole registration with the same `requestId`; the application first checks whether that logical request already exists.

## 10. Business duplicate operations

`requestId` protects transport replay.

Separately:

- exact active duplicate with matching contact: no new row,
- probable duplicate with changed contact: new row with `POSSIBLE_DUPLICATE_OF`,
- different offering or season: valid independent request,
- previous `REJECTED`/`CANCELLED`: may be submitted again.

Google Sheets does not provide hard atomic uniqueness. If hard uniqueness becomes required, change storage rather than pretending Sheets is a transactional database.

## 11. Operator workflow

Current statuses:

```text
NEW
IN_REVIEW
CONTACTED
WAITLISTED
CONFIRMED
REJECTED
CANCELLED
```

Operator-managed fields:

```text
STATUS
ASSIGNED_GROUP_ID
CONTACTED_AT
CONFIRMED_AT
CLOSED_AT
NOTES
```

`STATUS` is a native Google Table dropdown. Native option/chip colors are UI-owned because the public Sheets API does not expose per-option chip colors.

Do not emulate status chips with whole-cell conditional formatting. Code-managed formatting is reserved for actionable warnings. Current PROD `ZAPISY` has five such warning rules.

`NOTES` must not become an uncontrolled health/family/special-category data store.

## 12. Group catalog

`ASSIGNED_GROUP_ID` is a native dropdown derived from active groups for `CURRENT_SEASON_ID`.

When the active group set changes, use the explicit `sheet:schema-sync` path. Do not rewrite Table metadata as part of routine operator work.

## 13. Abuse protection

Application-level controls include JSON-only API, body-size limit, honeypot, minimum fill time, server validation and PII-safe logging.

Vercel WAF is the production rate-limit layer. Do not load-test PROD by creating unnecessary registration rows.

Turnstile remains an escalation only if real abuse shows WAF plus existing heuristics are insufficient.

## 14. Production preflight

Environment validation:

```bash
pnpm prod:env:validate
```

Passing the command validates configuration shape/presence. It does not prove external IAM, Sheet permissions or sender-domain correctness.

Closed-production verification must include:

1. canonical PROD Sheet ID,
2. dedicated PROD service account,
3. production-only WIF binding,
4. approved Sheet ACL,
5. closed intake,
6. schema/table/protection validation,
7. notification outbox adoption/health,
8. privacy/legal settings,
9. production Resend sender/admin recipient,
10. WAF verification,
11. Vercel deployment exact-SHA check,
12. runtime log check.

Do not seed TEST fixtures into PROD.

## 15. Final opening operation

Only after every blocking release item is complete:

```text
REGISTRATIONS_OPEN=TRUE
```

After opening, perform a minimal controlled real-path verification, confirm notification delivery and monitor errors/WAF activity without logging PII.

## 16. External/manual gates

Engineering cannot truthfully close these from CI alone:

- physical display of adopted child-protection documents,
- physical Android/iPhone acceptance,
- keyboard/focus/200% zoom/visual contrast human review,
- final human legal-document read-through,
- broader Google Cloud IAM least-privilege review beyond Sheet ACL,
- GitHub branch-protection/ruleset configuration requiring repository admin capability.

See `docs/RELEASE_CHECKLIST.md`.
