# Architecture

## Layers

```text
src/domain
  Pure business types and rules

src/application
  Use cases and stable application errors

src/infrastructure
  Google Sheets, e-mail and memory adapters

src/app
  Next.js transport and UI
```

## Dependency direction

The domain does not import:

- Next.js,
- React,
- Google APIs,
- Vercel.

The application layer depends on repository/provider interfaces rather than Google or Resend implementations.

## Current v3 request path

```text
Browser
-> Next.js App Router
-> POST /api/registrations
-> JSON/content-size checks
-> Zod parse + normalization
-> honeypot + minimum-fill-time checks
-> requestId replay lookup
-> catalog/settings/current-season read
-> global registrations-open check
-> city/offering/current-season validation
-> server-authoritative offering intake calculation
-> business duplicate lookup
-> exact duplicate: successful no-op
   OR probable duplicate: create with POSSIBLE_DUPLICATE_OF
   OR normal request: create
-> Google Sheets native table persistence
-> best-effort participant/admin notifications
-> public success result
```

Notifications are scheduled only after successful persistence. A mail failure does not roll back a registration.

## Two duplicate boundaries

### Transport idempotency

The same logical submission keeps the same `requestId`.

- replay with the same logical payload returns the existing result,
- the same `requestId` with a conflicting logical payload returns `REQUEST_ID_CONFLICT`,
- non-idempotent Google append is not blindly retried.

### Business duplicate detection

A later form attempt has a new `requestId`, so the server separately checks participant identity + offering + city + season.

- exact active duplicate: no second row,
- probable duplicate: row is created and flagged,
- other offering/season: valid independent row.

These mechanisms must not be collapsed into one concept.

## Google Sheets boundary

Current v3 storage uses:

```text
MIASTA
SEZONY
OFERTY_ZAJEC
GRUPY
ZAPISY
USTAWIENIA
```

`ZAPISY` remains a native Google Sheets Table named `Rejestracje` and the canonical registration dataset.

The adapter maps by header name and resolves native table metadata. Operator-first visibility/filtering is metadata around the same canonical table, not a second copy of registrations.

## Concurrency boundary

Google Sheets has no SQL-style `UNIQUE` constraint or multi-row transaction for this workflow.

Two truly simultaneous requests with different request IDs can theoretically both pass business-deduplication reads before either append becomes visible. Reconciliation detects candidates after the fact, but v3 does not claim hard atomic uniqueness.

If the product requires any of the following, trigger storage review:

- atomic last-place reservation,
- hard capacity counters,
- hard uniqueness under concurrency,
- high-volume indexed duplicate lookup,
- stronger transactional workflow guarantees.

The likely next storage class would be PostgreSQL/Supabase rather than adding fragile locking tricks around Sheets.

## Ambiguous writes

Registration append is non-idempotent and is not automatically retried inside the Google client.

If persistence outcome is ambiguous, retry the complete application request with the same `requestId`. The application first reconciles against the existing request ID before deciding whether another create is safe.

## TEST / PROD identity boundary

Canonical TEST:

```text
Vercel Preview branch `preview`
-> Vercel OIDC
-> Google WIF
-> TEST service account
-> TEST Sheet only
```

Production target:

```text
Vercel Production / main
-> separate OIDC subject binding
-> separate PROD service account
-> PROD Sheet only
```

The TEST identity must never be expanded into a shared TEST+PROD principal.

## Abuse boundary

Application heuristics include JSON-only requests, body-size limit, honeypot and minimum fill time.

Volume protection for public launch is handled at the hosting firewall layer rather than with per-process memory inside distributed Vercel Functions. See `docs/ABUSE_PROTECTION.md` after PR10 is merged.

Business deduplication is not an anti-abuse control.

## Production fail-closed

A Vercel Production deployment without explicit `APP_ENV=production` is rejected by the production guard. Production environment parsing also requires Google Sheets + Resend and, on Vercel, complete WIF configuration.

`REGISTRATIONS_OPEN=TRUE` is a business release switch, not a substitute for environment/security validation. It remains the final operation after production readiness, legal/operational gates and manual QA are complete.
