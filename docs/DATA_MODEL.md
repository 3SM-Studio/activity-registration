# Data model

This document describes the **currently implemented schema v3**. Historical v1/v2 contracts are retained only where they matter for migration and legacy-row handling.

The executable Google Sheets contract lives in `src/infrastructure/google/sheets-contracts.ts` and is authoritative when documentation and code differ.

## Current schema version

```text
SYSTEM_SCHEMA_VERSION=3
REGISTRATION_SCHEMA_VERSION=3 for new registrations
```

Historical v1/v2 registration rows may remain at their original row schema version where values cannot be truthfully backfilled.

## MIASTA

```text
CITY_ID
NAME
ACTIVE
SORT_ORDER
```

`CITY_ID` is the stable identifier used by offerings and registration snapshots.

## SEZONY

```text
SEASON_ID
NAME
START_DATE
END_DATE
ACTIVE
SORT_ORDER
```

The public registration season is selected explicitly with `CURRENT_SEASON_ID` in `USTAWIENIA`. The application does not infer the current season only from the calendar month.

## OFERTY_ZAJEC

```text
OFFERING_ID
CITY_ID
NAME
PUBLIC_DESCRIPTION
ACTIVE
SORT_ORDER
REGISTRATION_MODE
INTAKE_STATE
REGISTRATION_OPEN_FROM
REGISTRATION_OPEN_TO
WAITLIST_ENABLED
```

`REGISTRATION_MODE`:

```text
ROLLING
WINDOWED
```

`INTAKE_STATE`:

```text
OPEN
WAITLIST_ONLY
CLOSED
```

The public application derives `OPEN`, `WAITLIST_ONLY`, `UPCOMING` or `CLOSED` from the stored configuration and the Poland-local current date. The server revalidates availability during submit; disabled browser options are not the security/correctness boundary.

Invalid catalog configuration fails diagnostics and submit handling closed.

## GRUPY

```text
GROUP_ID
SEASON_ID
OFFERING_ID
NAME
AGE_MIN
AGE_MAX
DAY_OF_WEEK
START_TIME
END_TIME
LOCATION
INSTRUCTOR
CAPACITY
ACTIVE
SORT_ORDER
```

`Group` is an internal Pozytywka concept selected after review. It is not a mandatory public form choice and v3 does not auto-assign groups.

The schema and operator field exist even when the real group catalog has not yet been supplied. Do not fabricate group rows. Real group data remains an external business input from Iwona.

## ZAPISY

`ZAPISY` is one native Google Sheets Table named `Rejestracje`. It is the canonical registration dataset.

Current system headers:

```text
REGISTRATION_ID
REQUEST_ID
SUBMITTED_AT
OFFERING_ID
CITY_ID_SNAPSHOT
CITY_NAME_SNAPSHOT
OFFERING_NAME_SNAPSHOT
PARTICIPANT_FIRST_NAME
PARTICIPANT_LAST_NAME
BIRTH_DATE
AGE_AT_SUBMISSION
GUARDIAN_FIRST_NAME
GUARDIAN_LAST_NAME
PHONE
EMAIL
STATUS
NOTES
PRIVACY_NOTICE_VERSION
SOURCE
CREATED_AT
UPDATED_AT
SEASON_ID
SEASON_NAME_SNAPSHOT
ASSIGNED_GROUP_ID
CONTACTED_AT
CONFIRMED_AT
POSSIBLE_DUPLICATE_OF
SCHEMA_VERSION
```

The adapter maps by header name rather than relying on a fragile fixed index. Operator metadata hides/reorders the normal working view without deleting technical fields.

### Status

Current enum:

```text
NEW
IN_REVIEW
CONTACTED
WAITLISTED
CONFIRMED
REJECTED
CANCELLED
```

Closed intake-workflow states are:

```text
CONFIRMED
REJECTED
CANCELLED
```

This application does not track later attendance or resignation from already-running classes.

### Operator fields

The operator workflow intentionally allows Iwona to edit:

```text
STATUS
ASSIGNED_GROUP_ID
CONTACTED_AT
CONFIRMED_AT
NOTES
```

Technical fields remain protected/hidden according to the Google Sheets metadata contract.

`UPDATED_AT` means application/system-write time. A direct manual edit in Sheets does not magically update it. `CONTACTED_AT` and `CONFIRMED_AT` exist for meaningful operator workflow timestamps.

### Date of birth

`BIRTH_DATE` is the source date for current registrations. `AGE_AT_SUBMISSION` is a historical snapshot calculated at submission time.

Legacy rows without a reliable `BIRTH_DATE` are not backfilled by guessing.

## USTAWIENIA

```text
KEY
VALUE
```

Supported keys include:

```text
SYSTEM_SCHEMA_VERSION
REGISTRATIONS_OPEN
CURRENT_SEASON_ID
PUBLIC_FORM_TITLE
SUCCESS_MESSAGE
PRIVACY_NOTICE_URL
PRIVACY_NOTICE_VERSION
```

Do not move all business configuration into this key/value sheet.

## Business duplicate identity

Transport idempotency and business deduplication are separate.

`REQUEST_ID` handles replay/double-submit of one logical request.

Business duplicate comparison uses normalized:

```text
participant first name
participant last name
BIRTH_DATE
CITY_ID
OFFERING_ID
SEASON_ID
```

Phone is normalized to E.164 and e-mail through the existing e-mail normalization strategy.

Current behavior:

- exact active duplicate with the same contact does not append another row,
- probable duplicate with changed contact is accepted and stores `POSSIBLE_DUPLICATE_OF`,
- another offering is a valid independent request,
- another season is a valid independent request,
- previous `REJECTED` or `CANCELLED` does not block a fresh request,
- legacy rows without reliable DOB cannot hard-block using guessed identity.

Google Sheets does not provide an atomic uniqueness constraint. Business dedupe is strong soft deduplication, not a transactional guarantee. Reconciliation can detect candidates after the fact. Hard uniqueness/capacity guarantees require a storage review.

## Migration history

### v1 -> v2

- replaced source age entry with full `BIRTH_DATE`,
- retained old age values as `AGE_AT_SUBMISSION`,
- converted `ZAPISY` to native Google Sheets Table,
- introduced typed birth date/status columns.

Historical v1 rows keep unknown birth dates empty.

### v2 -> v3

Implemented as an explicit versioned migration:

- adds `SEZONY`,
- adds `GRUPY`,
- extends `OFERTY_ZAJEC`,
- extends `ZAPISY`,
- adds `CURRENT_SEASON_ID`,
- updates table/protection/status metadata,
- preserves unknown historical fields as empty,
- sets system schema v3 only after structural work succeeds,
- detects already-applied/partial structures and fails closed rather than duplicating them.

Rollback remains restore-from-backup rather than pretending Google Sheets batch operations have a fully transactional reverse migration.

## Current TEST evidence

The canonical Preview currently reads the TEST v3 catalog successfully with an explicit current season and v3 intake statuses while TEST registrations remain closed. This proves the live TEST path is no longer operating on the old v2 contract.

Use `sheet:validate`, `diagnostics`, `registrations:reconcile` and the dedicated TEST-only real-Google integration command for structural/reconciliation verification before release work.

See `docs/REGISTRATION_V3_PLAN.md` for the original v3 contract and `docs/RELEASE_CHECKLIST.md` for remaining release gates.
