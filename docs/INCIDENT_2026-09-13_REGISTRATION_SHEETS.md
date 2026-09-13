# Incident 2026-09-13: production registration failures

## Symptoms

- Public form page remained available.
- `POST /api/registrations` returned HTTP 503.
- Application logs reported `SheetsApiError` with upstream status 500.
- Earlier in the incident Google Sheets also returned short-lived HTTP 429 responses on read traffic.

## Findings

- Production code and credentials had previously written registrations successfully.
- The production `ZAPISY` schema still matched the application contract.
- The registration repository performed duplicate full-sheet reads and used the Google Sheets native table append path as the only write path.
- Production sheet validation also found catalog drift: `bukowno-folk-flow-tanczmy` was active while its current-season group was inactive, despite the source catalog defining that group as active.

## Recovery

- Registration reads were bounded to the actual A:AC schema and memoized per request.
- Native table append 5xx responses are now handled as ambiguous writes: the repository verifies whether the request ID was already committed before doing anything else.
- If the native table write was not committed, the repository falls back to `values.append`.
- The fallback does not run for 400/403/429 responses.
- Exact Sheets operation stages are logged without participant PII.
- Production `GRUPY` row for `bukowno-folk-flow-tanczmy-2026-2027` was restored to `ACTIVE=TAK`, matching the source catalog.

## Verification

PR #99 passed the full repository quality gate, Chrome Playwright E2E, and iPhone WebKit E2E before merge.
