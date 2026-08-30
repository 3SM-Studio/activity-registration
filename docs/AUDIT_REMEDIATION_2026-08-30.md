# Audit remediation 2026-08-30

Status: launch-critical hardening completed and Production live. Remaining items are explicit post-launch technical, organizational or human follow-up and must not be presented as already solved.

## 1. Launch-critical remediation completed

Implemented and deployed through PR #81 / #82:

- [x] patch Next.js / eslint-config-next to 16.3.3 security maintenance release,
- [x] map `PARTICIPANT_AGE_NOT_ELIGIBLE` to HTTP 422 instead of false HTTP 500,
- [x] fix eligibility for children born after the current season started while preserving season-start age for normal school-year groups,
- [x] move the age-reference edge-case policy into a tested domain helper,
- [x] pin the production e-mail logo to an immutable Git commit instead of mutable `preview`,
- [x] reuse Google Auth clients within a warm runtime instead of recreating the WIF client for every Sheets request,
- [x] bound Google Sheets requests with an application timeout,
- [x] bound Resend requests with an application timeout,
- [x] keep non-idempotent Google writes without automatic transport retry,
- [x] add a secured notification reconciliation endpoint,
- [x] require a production `CRON_SECRET`,
- [x] add a Vercel Hobby-compatible daily reconciliation cron,
- [x] retain immediate e-mail delivery attempt after every successful Registration,
- [x] correct success-screen wording so it does not claim that an asynchronous e-mail has already been delivered,
- [x] correct confirmation-mail wording for concrete offerings,
- [x] align the final form disclaimer with request-intake semantics,
- [x] add iPhone WebKit E2E coverage in CI,
- [x] add regression coverage for production cron configuration and post-season-start births.

## 2. Launch evidence completed

Automated / infrastructure evidence:

- [x] PR #81 `pnpm check` passed,
- [x] critical Chromium E2E passed,
- [x] iPhone WebKit E2E passed,
- [x] PR #81 merged to `main` only after required checks passed,
- [x] exact runtime-changing `main` SHA reached Vercel Production `READY`,
- [x] Production build passed `prod:env:validate`, `sheet:validate` and `diagnostics`,
- [x] closed-state Production GET returned HTTP 200,
- [x] notification cron endpoint rejected unauthenticated calls with HTTP 401,
- [x] Vercel accepted the Hobby-compatible daily cron configuration,
- [x] Production runtime check showed no new warning/error/fatal cluster,
- [x] Production historical Registration/outbox data remained preserved during rollout,
- [x] Production outbox had no `FAILED` jobs or expired leases before reopening,
- [x] `CRON_SECRET` exists in Vercel Production and is not stored in Git,
- [x] active GitHub ruleset protects `main` and `preview`, requires PR + `check` + `webkit`, blocks deletion/force push and permits only squash on those branches,
- [x] Production reopened only after the verified deployment and data path were healthy,
- [x] live Production GET returns HTTP 200 with `REGISTRATIONS_OPEN=TRUE` and the current 3-location / 18-offering catalog.

Launch-hardening runtime evidence:

```text
Runtime-changing SHA  5d8628f5bf908b304dcfc172c95d2b8a5c1244f6
Runtime deployment    dpl_5zQbApatboZBQp3J2CX63KT4fn1w
State                 READY
Intake                OPEN
```

Later docs-only commits can advance `main` and create newer Production deployments without changing application runtime behavior. Current HEAD/deployment must therefore be checked directly in GitHub/Vercel, not inferred from the evidence block above.

## 3. Remaining human / organizational evidence

These cannot be honestly replaced by automated CI:

- [ ] broader Google Cloud IAM least-privilege review beyond the Sheet ACL,
- [ ] full Standardy Ochrony Małoletnich v1.1 physically available/displayed as required by the adopted procedure,
- [ ] shortened child-friendly Standardy physically available/displayed as required by the adopted procedure,
- [ ] real Android Chrome smoke,
- [ ] real iPhone Safari smoke,
- [ ] keyboard-only flow manually accepted,
- [ ] visible focus states manually accepted,
- [ ] 200% zoom/reflow manually accepted,
- [ ] visual contrast/readability manually accepted,
- [ ] final human read-through of privacy notice and adopted child-protection documents.

Repository hygiene still requiring UI/admin verification:

- [ ] normalize repository-level merge settings where desired: merge commits off, rebase off, auto-merge on, head-branch cleanup on, update branch on,
- [ ] verify GitHub security defaults available to the repository/organization: Dependabot alerts/security updates, secret scanning/push protection, private vulnerability reporting and CodeQL/default scanning as applicable.

## 4. Preview synchronization

Direct `main -> preview` merge was historically conflicted. A safe sync branch was created from the old `preview` and assigned the exact runtime-changing Production `main` tree without force-pushing the protected branch.

- [x] sync branch tree equals the runtime-changing Production `main` tree,
- [x] PR #84 opened against protected `preview`,
- [x] required `check` passed,
- [x] required `webkit` passed,
- [x] PR #84 merged to protected `preview` as `41a5eb7f65a49e27ef68aa6f28e251dc846976cb`,
- [x] resulting `preview` tree is `c74a2e425d735b9cc5d8285e68acd8884331b4c0`, exactly matching the Production runtime tree before docs-only follow-ups.

## 5. Deliberately not rushed into the launch hotfix

The following findings remain real. Replacing the storage/model architecture several hours before public launch would have increased risk, so they remain mandatory follow-up work.

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

## 6. Current engineering decision

Do not rewrite the application during launch stabilization. The live v4 system remains acceptable as a small request-intake application provided its known residual risks are tracked and operations stay disciplined.

The first significant architecture initiative after launch is transactional-core migration planning, not another layer of transactional behavior on top of Google Sheets.
