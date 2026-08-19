# Registration operator workflow

This document describes the operational status model used in `ZAPISY` for registration schema v3.

## Statuses

| Status | Meaning |
| --- | --- |
| `NEW` | New request waiting for operator review. |
| `IN_REVIEW` | Operator is actively reviewing the request. |
| `CONTACTED` | Operator has contacted the participant or guardian. |
| `WAITLISTED` | Request is kept on a waiting list. |
| `CONFIRMED` | Place has been confirmed by the operator. |
| `REJECTED` | Request was rejected and no longer blocks a fresh request for the same activity. |
| `CANCELLED` | Request was cancelled and no longer blocks a fresh request for the same activity. |

## Migration from the previous workflow

`sheet:migrate` is idempotent and maps the two retired values without changing registration schema version:

- `IN_PROGRESS` -> `IN_REVIEW`,
- `ACCEPTED` -> `CONFIRMED`.

The application can read the retired values during the migration window, but diagnostics fail while any of them remain in `ZAPISY`.

## Operator timestamps

`CONTACTED_AT` and `CONFIRMED_AT` remain operator-managed fields. The application does not fabricate timestamps from a status change because Google Sheets is currently the operational console and there is no trustworthy server-side status transition event to timestamp.

When a future operator UI owns transitions, timestamp automation can be added there with an auditable transition event.

## Duplicate handling interaction

`REJECTED` and `CANCELLED` are terminal states that allow a fresh request for the same participant, season and activity. Other statuses remain active for business deduplication.

## Release checks

Before treating workflow migration as complete:

1. run `pnpm sheet:migrate` on the intended non-production sheet,
2. run `pnpm sheet:validate`,
3. run `pnpm diagnostics` and require `legacyWorkflowStatusCount: 0`,
4. verify the `STATUS` table dropdown contains exactly the seven current values,
5. do not open production registrations as part of this migration.
