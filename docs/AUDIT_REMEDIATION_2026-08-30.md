# Audit remediation 2026-08-30

Status: launch hardening in progress. Production intake remains closed until the launch gate is complete.

This document records the complete remediation scope from the 2026-08-30 application audit so that launch-critical fixes and post-launch architecture work are not mixed together or forgotten.

## 1. Launch-critical remediation

Implemented in PR #81:

- patch Next.js / eslint-config-next to 16.3.3 security maintenance release,
- map `PARTICIPANT_AGE_NOT_ELIGIBLE` to HTTP 422 instead of false HTTP 500,
- fix eligibility for children born after the current season started while preserving season-start age for normal school-year groups,
- move the age-reference edge-case policy into a tested domain helper,
- pin the production e-mail logo to an immutable Git commit instead of mutable `preview`,
- reuse Google Auth clients within a warm runtime instead of recreating the WIF client for every Sheets request,
- bound Google Sheets requests with an application timeout,
- bound Resend requests with an application timeout,
- keep non-idempotent Google writes without automatic transport retry,
- add a secured notification reconciliation endpoint,
- require a production `CRON_SECRET`,
- add a Vercel Hobby-compatible daily reconciliation cron,
- retain immediate e-mail delivery attempt after every successful Registration,
- correct success-screen wording so it does not claim that an asynchronous e-mail has already been delivered,
- correct confirmation-mail wording for concrete offerings,
- add iPhone WebKit E2E coverage in CI,
- add regression coverage for production cron configuration and post-season-start births,
- keep Production `REGISTRATIONS_OPEN=FALSE` throughout the hardening rollout.

## 2. Launch gate still requiring evidence

Do not set Production `REGISTRATIONS_OPEN=TRUE` until all required items below are complete.

### Automated

- [ ] PR #81 final `pnpm check` passes,
- [ ] critical Chromium E2E passes,
- [ ] iPhone WebKit E2E passes,
- [ ] PR #81 merged to `main` only after all checks pass,
- [ ] exact new `main` SHA reaches Vercel Production `READY`,
- [ ] Production build passes `prod:env:validate`, `sheet:validate` and `diagnostics`,
- [ ] closed-state Production GET returns HTTP 200,
- [ ] notification cron endpoint rejects unauthenticated calls,
- [ ] Vercel registers the daily cron successfully,
- [ ] Production runtime logs show no new warning/error/fatal cluster,
- [ ] Production Sheet retains historical Registration/outbox data unchanged during rollout,
- [ ] `preview` is synchronized with the verified Production code after the hotfix.

### Manual / organizational

- [ ] `CRON_SECRET` exists in the Vercel Production environment and is not stored in Git,
- [ ] GitHub `main` and `preview` rulesets/branch protection are enabled if repository permissions allow it,
- [ ] broader Google Cloud IAM least-privilege review is completed or explicitly accepted as a documented residual launch risk,
- [ ] full Standardy Ochrony Małoletnich v1.1 are physically available/displayed as required by the adopted procedure,
- [ ] shortened child-friendly Standardy are physically available/displayed as required by the adopted procedure,
- [ ] real Android Chrome smoke is complete,
- [ ] real iPhone Safari smoke is complete,
- [ ] keyboard-only flow is manually accepted,
- [ ] visible focus states are manually accepted,
- [ ] 200% zoom/reflow is manually accepted,
- [ ] visual contrast/readability is manually accepted,
- [ ] final human read-through of privacy notice and adopted child-protection documents is complete.

## 3. Deliberately not rushed into the launch hotfix

The following findings are real, but replacing the storage/model architecture several hours before public launch would increase deployment risk. They remain mandatory follow-up work.

### P1 architecture and reliability

1. Move the transactional system of record from Google Sheets to PostgreSQL while retaining Sheets as an operator projection/interface where useful.
2. Enforce `REQUEST_ID` uniqueness with a database constraint instead of read-then-append idempotency.
3. Use database transactions for Registration + outbox creation.
4. Use atomic queue claiming (`FOR UPDATE SKIP LOCKED` or equivalent) instead of Sheets read/update/read leases.
5. Replace full-sheet scans in request paths with indexed queries.
6. Separate build/deployability of application code from health of mutable Production data so an emergency security deployment cannot be blocked by an unrelated failed notification job.
7. Add restore-tested backup and disaster-recovery procedure for the transactional store.
8. Add operational alerting for 5xx, Sheets/provider 429/5xx, notification `FAILED`, expired leases and retry lag.

### P2 domain model

9. Separate `City` and `Venue`; current city labels also encode venues.
10. Add one-to-many `GroupSession` / schedule entities instead of encoding SynTeza's two weekly sessions in one text field.
11. Add an append-only `RegistrationEvent` / audit trail for operator workflow changes.
12. Snapshot the public offering/version shown at submission, including material description/schedule/price information where applicable.
13. Version legal/privacy content immutably so `PRIVACY_NOTICE_VERSION` can be tied to exact historical content.
14. Replace or constrain free-text `NOTES` so operators are less likely to store unnecessary health/special-category data.
15. Define explicit per-offering age-reference semantics when business rules require something other than the current school-year default plus infant fallback.
16. Obtain exact business age ranges for both theatres and Babeczki instead of broad technical guards.
17. Add real group capacities if Pozytywka wants the system to reason about availability rather than remain request-intake only.

### P2 security / platform hardening

18. Add a fuller nonce/hash-based CSP after validating Next.js compatibility, rather than adding unsafe directives before launch.
19. Add CodeQL/security scanning and a dependency-vulnerability/advisory gate.
20. Pin GitHub Actions to immutable commit SHAs and let Dependabot maintain the pins.
21. Review Google Drive/Sheet ownership so critical Production data is not dependent on personal-account ownership or unnecessary writers.
22. Perform recurring access/offboarding review for Production Sheet and cloud identities.
23. Revisit the public duplicate response so exact duplicate detection is not externally distinguishable if that UX signal is not necessary.
24. Revisit stronger request-body streaming limits if abuse volume warrants it.
25. Decide explicitly whether phone validation should remain permissive (`possible`) or become stricter (`valid`) based on business tolerance for false negatives.

### P2 product / operations

26. Remove or actually use configuration keys such as `SUCCESS_MESSAGE` so the Sheet does not expose settings that do not control the current UI.
27. Make catalog refresh rollback-safe with pre-change snapshot, postconditions and an explicit recovery path.
28. Automate retention review and eventually controlled purge/anonymization with audit evidence.
29. Cache stable public catalog reads separately from fresh release switches to reduce Google API load without delaying emergency close/open controls.
30. Keep `preview` synchronized after every direct Production hotfix so staging remains meaningful.

## 4. Launch decision rule

The launch hotfix does not pretend to solve the long-term database redesign. The launch is acceptable only when:

1. current Production code is secure and verified,
2. current data path is healthy,
3. automatic first-attempt notification delivery works and durable failed state cannot disappear,
4. the daily recovery worker is configured for the current Hobby plan,
5. required human/legal/organizational gates are completed or a responsible owner explicitly records why a specific non-legal item is accepted as residual risk,
6. the form is opened only as the final controlled action.

After launch, the first architecture initiative is transactional-core migration planning, not another layer of transactional behavior on top of Google Sheets.
