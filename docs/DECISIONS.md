# Decisions

## Current product decisions for v3

These decisions supersede conflicting MVP assumptions below. Runtime is still schema v2 until explicit v3 migrations are implemented.

1. The application is a public registration-request system, not an automatic place reservation or checkout.
2. The public user selects a city and a public `Offering`. The final internal `Group` and weekly time are chosen later by Pozytywka after review/contact.
3. One submission is one participant + one offering + one season. Different offerings are independent valid submissions.
4. `requestId` remains transport idempotency only. v3 adds separate business duplicate detection.
5. Full `BIRTH_DATE` is retained because exact age supports group matching and guardian logic. `AGE_AT_SUBMISSION` remains a historical snapshot.
6. A new first-class `Season` concept is required. Current season will be selected explicitly by `CURRENT_SEASON_ID` rather than inferred only from calendar month.
7. A new internal `Group` concept is required for operator assignment after review. It is not a public required field.
8. Offerings must support `ROLLING` and `WINDOWED` registration modes without hardcoding theatre by name.
9. Offerings must support intake state `OPEN`, `WAITLIST_ONLY` or `CLOSED`.
10. Waiting list is part of the target business workflow.
11. Target registration statuses are `NEW`, `IN_REVIEW`, `CONTACTED`, `WAITLISTED`, `CONFIRMED`, `REJECTED`, `CANCELLED`.
12. `CONFIRMED` means Pozytywka completed review/contact and confirmed a concrete participation arrangement. This application does not track later attendance or resignation from already-running classes.
13. Exact active business duplicates should not create another row. Probable duplicates with changed contact details should be accepted but flagged internally.
14. Business duplicate identity uses normalized participant name + exact birth date + city + offering + season. Phone/email are additional exactness signals.
15. Same participant on another offering or another season is not a duplicate.
16. Legacy records without reliable DOB must not hard-block a new request using guessed identity.
17. Google Sheets business dedupe is soft deduplication, not an atomic uniqueness guarantee. Hard transactional uniqueness triggers storage review.
18. `ZAPISY` remains one canonical native Google Sheets Table. Do not create separate per-status registration sheets.
19. Google Sheets remains the temporary operator/admin surface. Optimize visible columns for Iwona while preserving technical columns.
20. Public form stays one page for current scope. Remove/redesign any fake stepper that implies multiple screens.
21. Participant success/email copy must state that Pozytywka will review and contact the user to choose/confirm a suitable group and time. Submission itself does not confirm a place.
22. The form must continue supporting adults. Guardian fields apply only under 18.
23. Do not add `GUARDIAN_RELATIONSHIP` until Iwona confirms it is operationally useful.
24. Do not add price, payment method, contract, resignation or theatre-specific rules until those facts are verified with Iwona.
25. Do not collect PESEL, address, school, health data, marketing consent, image consent or other extra PII without a separately approved purpose.
26. Do not add a generic `Wyrażam zgodę na RODO` checkbox as a fake universal legal basis.
27. Production remains blocked on approved privacy notice, retention, access/processor inventory and remaining legal/operational gates.
28. Before PROD, record confirmation that Pozytywka has the applicable Standardy Ochrony Małoletnich and required personnel verification procedures. Do not store those personnel records in `ZAPISY`.
29. Normal TEST QA must use synthetic data only. Real/manual PII in TEST must be cleaned in the dedicated hygiene stage.
30. TEST and PROD keep separate Sheets and separate identities. v3 implementation/testing must never write to PROD.
31. Vercel canonical preview must be verified against GitHub `preview` HEAD before product QA. Do not claim deployment from GitHub state alone.
32. The v3 implementation is intentionally split into multiple PRs. Do not build it as one giant change.
33. `docs/REGISTRATION_V3_PLAN.md` is the canonical v3 implementation contract and takes precedence over conflicting older product assumptions.

## Preserved engineering decisions

1. Public frontend/API: Next.js App Router.
2. Storage remains Google Sheets behind repository adapters until a real scale/transaction trigger appears.
3. Vercel uses OIDC + Google Workload Identity Federation. Preview and Production must have separate principals.
4. No production JSON private key is stored in repo/env flow.
5. Adapter maps system columns by header name rather than fixed index.
6. System Sheets have exact contracts. Structural changes require explicit versioned migration.
7. `sheet:bootstrap` is non-destructive, `sheet:validate` is read-only and `sheet:migrate` is explicit.
8. `SYSTEM_SCHEMA_VERSION` is the source of truth for spreadsheet structure.
9. Do not automatically retry non-idempotent append/batchUpdate operations.
10. Ambiguous write recovery uses the same `requestId` and reconciliation before another append attempt.
11. Privacy notice and retention remain PROD release gates.
12. Hard capacity reservation or hard transactional uniqueness triggers storage review.
13. Accessibility target remains WCAG 2.2 AA, with automated mobile checks plus manual keyboard/focus/reflow/device smoke before PROD.
14. Public repo remains intentional. Secrets, credentials, local env and participant PII must never be committed.
15. Technical registration columns remain protected; operator columns remain intentionally editable.
16. E-mail stays best-effort after persistence. E-mail failure must not roll back the registration.
17. `pnpm check` and full Playwright E2E are required before merge. Google-backed changes require explicit TEST-only integration verification.

## Historical MVP decisions, partially superseded

The old MVP decisions are kept here only as implementation history. The following are explicitly superseded by v3:

- old decision to avoid business duplicate blocking,
- old decision to store only integer age,
- old decision to avoid an internal `Class`/`Group` concept,
- old four-status workflow,
- old assumption that waitlist is deferred.

Do not use those historical assumptions to reverse current v2/v3 product direction.

## Engineering baseline, 2026-08-19

- Runtime: Node.js 24.19.0 LTS.
- Package manager: pnpm 11.20.0.
- Dependencies are exact-pinned and locked by `pnpm-lock.yaml`.
- TypeScript 6.0.3 and ESLint 9.39.5 are intentional compatibility pins.
- `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and `noImplicitOverride` are active.
- Vercel Preview uses verified OIDC -> Google WIF -> TEST service account flow.
- Real TEST Google Sheets and Resend integration were verified during v2 work.
