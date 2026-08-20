# Decisions

## Current product decisions for v3

These decisions supersede conflicting MVP assumptions below. **Schema/runtime v3 is now implemented in code and active on the canonical TEST path.** Remaining work is real business data plus privacy, abuse-platform and production-readiness gates.

1. The application is a public registration-request system, not an automatic place reservation or checkout.
2. The public user selects a city and a public `Offering`. The final internal `Group` and weekly time are chosen later by Pozytywka after review/contact.
3. One submission is one participant + one offering + one season. Different offerings are independent valid submissions.
4. `requestId` remains transport idempotency only. v3 uses separate business duplicate detection.
5. Full `BIRTH_DATE` is retained because exact age supports group matching and guardian logic. `AGE_AT_SUBMISSION` remains a historical snapshot.
6. `Season` is a first-class concept. Current season is selected explicitly by `CURRENT_SEASON_ID` rather than inferred only from calendar month.
7. Internal `Group` exists for operator assignment after review. It is not a public required field and v3 does not auto-assign it.
8. Offerings support `ROLLING` and `WINDOWED` registration modes without hardcoding theatre by name.
9. Offerings support intake state `OPEN`, `WAITLIST_ONLY` or `CLOSED`; the public layer can additionally derive `UPCOMING`.
10. Waiting list is part of the business workflow.
11. Registration statuses are `NEW`, `IN_REVIEW`, `CONTACTED`, `WAITLISTED`, `CONFIRMED`, `REJECTED`, `CANCELLED`.
12. `CONFIRMED` means Pozytywka completed review/contact and confirmed a concrete participation arrangement. This application does not track later attendance or resignation from already-running classes.
13. Exact active business duplicates do not create another row. Probable duplicates with changed contact details are accepted but flagged internally.
14. Business duplicate identity uses normalized participant name + exact birth date + city + offering + season. Phone/e-mail are additional exactness signals.
15. Same participant on another offering or another season is not a duplicate.
16. Legacy records without reliable DOB must not hard-block a new request using guessed identity.
17. Google Sheets business dedupe is soft deduplication, not an atomic uniqueness guarantee. Hard transactional uniqueness triggers storage review.
18. `ZAPISY` remains one canonical native Google Sheets Table. Do not create separate per-status registration sheets.
19. Google Sheets remains the temporary operator/admin surface. Operator-first metadata/views improve Iwona's working surface while preserving technical fields.
20. Public form stays one page for current scope. A fake multi-screen stepper is not used.
21. Participant success/e-mail copy states that Pozytywka will review and contact the user to choose/confirm a suitable group and time. Submission itself does not confirm a place.
22. The form continues supporting adults. Guardian fields apply only under 18.
23. Do not add `GUARDIAN_RELATIONSHIP` until Iwona confirms it is operationally useful.
24. Do not add price, payment method, contract, resignation or theatre-specific rules until those facts are verified with Iwona.
25. Do not collect PESEL, address, school, health data, marketing consent, image consent or other extra PII without a separately approved purpose.
26. Do not add a generic `Wyrażam zgodę na RODO` checkbox as a fake universal legal basis.
27. Production remains blocked on approved privacy notice, retention, access/processor inventory and remaining legal/operational gates.
28. Before PROD, record confirmation that Pozytywka has the applicable Standardy Ochrony Małoletnich and required personnel verification procedures. Do not store those personnel records in `ZAPISY`.
29. Normal TEST QA uses synthetic data only.
30. TEST and PROD keep separate Sheets and separate identities. Development/testing must never write to PROD.
31. Vercel canonical Preview must be verified against GitHub `preview` HEAD before product QA. Do not claim deployment from GitHub state alone.
32. The v3 implementation is intentionally split into logical PRs; do not collapse future unrelated work into a giant change.
33. `docs/REGISTRATION_V3_PLAN.md` remains the canonical v3 contract for intended behavior. Current code/truth docs record what has actually landed.
34. Real internal groups are not fabricated merely to make the v3 schema look populated.
35. Production volume protection uses a hosting-layer rate limit before adding a browser challenge. Turnstile is an escalation only if real abuse justifies it.
36. `REGISTRATIONS_OPEN=TRUE` is the final production opening operation, not a substitute for the release checklist.

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
15. Technical registration columns remain protected/hidden; operator workflow fields remain intentionally editable.
16. E-mail stays best-effort after persistence. E-mail failure must not roll back the registration.
17. `pnpm check` and full Playwright E2E are required before merge. Google-backed changes require explicit TEST-only integration verification.
18. Production env configuration is fail-closed and additionally has a secret-safe `pnpm prod:env:validate` preflight.

## Historical MVP decisions, superseded where noted

The old MVP decisions are kept only as implementation history. These assumptions are superseded by v3 and must not be resurrected:

- avoiding business duplicate blocking,
- storing only integer age,
- avoiding an internal `Class`/`Group` concept,
- the old four-status workflow,
- deferring waiting-list support,
- treating schema v2 as the current target.

## Engineering baseline, 2026-08-20

- Runtime target: Node.js 24.x.
- Package manager: pnpm 11.20.0.
- Dependencies are exact-pinned and locked by `pnpm-lock.yaml`.
- Next.js 16.3.0, TypeScript 6.0.3 and ESLint 9.39.5 are current compatibility pins.
- `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and `noImplicitOverride` are active.
- Vercel canonical Preview uses OIDC -> Google WIF -> TEST service account -> TEST Sheet.
- TEST v3 catalog is readable from the live canonical Preview while registrations remain closed.
- Production remains intentionally unopened until the final release gates are complete.
