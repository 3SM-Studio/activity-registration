# Release checklist

Date: 2026-08-30
Target: Pozytywka Registration v4
Status: Production live; automated launch-hardening gate complete. Remaining human/organizational items are tracked explicitly as post-launch residual acceptance and must not be fabricated as completed.

## Current live state

- [x] Production deployment is `READY`
- [x] Production SHA `5d8628f5bf908b304dcfc172c95d2b8a5c1244f6`
- [x] Production deployment `dpl_5zQbApatboZBQp3J2CX63KT4fn1w`
- [x] `SYSTEM_SCHEMA_VERSION=4`
- [x] `CURRENT_SEASON_ID=2026-2027`
- [x] `REGISTRATIONS_OPEN=TRUE`
- [x] 3 active locations
- [x] 18 active public offerings
- [x] public GET returns HTTP 200 with the open registration form
- [x] no new warning/error/fatal cluster found after live smoke

## Product and business

- [x] user chooses location + concrete public Offering, not internal Group
- [x] request requires human verification/contact before participation confirmation
- [x] form does not claim automatic reservation
- [x] adult and minor flows supported
- [x] waiting-list workflow supported
- [x] season model implemented
- [x] current 2026/2027 offer adopted
- [x] missing end-time rule clarified: 60 minutes by default
- [x] `Pląsanie` duration clarified as 30 minutes
- [x] unconfirmed instructors/capacities remain unknown rather than fabricated
- [x] current unresolved business inputs are documented in `docs/OFFER_CATALOG_2026-2027.md`

## Runtime and automated acceptance

- [x] Next.js 16.3.3 security maintenance release deployed
- [x] strict TypeScript / Zod server validation
- [x] schema v4 code deployed
- [x] `SEZONY`, `GRUPY`, `CURRENT_SEASON_ID`
- [x] business duplicate handling
- [x] requestId idempotency guard
- [x] native Google Table `Rejestracje`
- [x] operator dashboard and current group dropdown
- [x] international phone input and controlled DOB picker
- [x] mobile overflow regressions covered at small viewports
- [x] phone-country dropdown regression covered at 375 px
- [x] Chromium Critical E2E green for launch-hardening PR
- [x] iPhone WebKit E2E green for launch-hardening PR
- [x] `PARTICIPANT_AGE_NOT_ELIGIBLE` fixed from false 500 to HTTP 422
- [x] post-season-start infant eligibility edge case fixed and tested
- [x] Google Sheets requests bounded by timeout
- [x] Resend requests bounded by timeout
- [x] Google WIF auth client reused in warm runtime

## Notification reliability

- [x] `POWIADOMIENIA` contains technical state only, no participant PII columns
- [x] stable confirmation/admin job IDs double as provider idempotency keys
- [x] `PENDING`, `SENDING`, `SENT`, `FAILED`, `SKIPPED` lifecycle
- [x] lease token + expiry
- [x] attempt counter and exponential backoff
- [x] immediate first-attempt delivery after Registration
- [x] `notifications:reconcile`
- [x] `notifications:retry`
- [x] historical `notifications:adopt` completed and must not be repeated on current PROD
- [x] secured `GET /api/cron/notifications`
- [x] unauthenticated cron call returns HTTP 401
- [x] `CRON_SECRET` configured in Vercel Production and not stored in Git
- [x] Vercel Hobby-compatible daily recovery cron deployed
- [x] Production outbox checked before reopen: no `FAILED`, no expired leases, historical jobs preserved

## Production Google Sheet

Canonical PROD Sheet ID:

`1DRcWvY8xfZDGjJLWOr8Ax1XsyBw4dWU8C6u9WGNvFfM`

- [x] separate PROD Sheet
- [x] schema v4 structure verified
- [x] production catalog/settings verified
- [x] current 3/18/18 location/offering/group data adopted
- [x] previous catalog data preserved inactive
- [x] historical `ZAPISY` preserved through catalog refresh and hardening
- [x] historical `POWIADOMIENIA` preserved
- [x] `POWIADOMIENIA` hard-protected for the dedicated PROD application identity
- [x] TEST service account absent from PROD Sheet ACL
- [x] Sheet sharing restricted to explicit accounts
- [x] launch-hardening Production build passed `sheet:validate` with zero warnings
- [x] launch-hardening Production build passed `diagnostics`

## Production identity / hosting

Production service account:

`activity-registration-prod@pozytywka-reg-3sm-260819.iam.gserviceaccount.com`

TEST/Preview service account:

`activity-registration@pozytywka-reg-3sm-260819.iam.gserviceaccount.com`

- [x] dedicated PROD service account exists
- [x] Production uses Vercel OIDC/WIF, not a long-lived JSON private key
- [x] Production validates canonical PROD Sheet and production identity
- [x] TEST identity is not present on PROD Sheet ACL
- [x] exact launch-hardening Vercel Production build passed `prod:env:validate`
- [x] exact deployment SHA reached `READY`
- [x] closed-state smoke performed before reopening registrations
- [x] registrations reopened only after the verified deployment/data path was healthy
- [ ] broader Google Cloud IAM least-privilege review beyond Sheet ACL

## GitHub governance

Active ruleset: `Protect main and preview`.

- [x] targets exactly `main` and `preview`
- [x] Pull Request required
- [x] approvals = 0 for solo-maintainer workflow
- [x] conversation resolution required
- [x] required status `check`
- [x] required status `webkit`
- [x] branch must be up to date before merge
- [x] only squash merge allowed by the protected-branch ruleset
- [x] branch deletion blocked
- [x] force push / non-fast-forward update blocked
- [x] no bypass actors
- [ ] repository-level merge convenience settings normalized (merge/rebase off, auto-merge/update-branch/head-branch cleanup as desired)
- [ ] GitHub security-default review completed and evidenced

## Privacy / RODO

- [x] controller and operational contact baseline adopted
- [x] public privacy page implemented
- [x] lawful-basis model documented
- [x] data minimization documented
- [x] processor/transfer model documented
- [x] access-control and data-subject procedures documented
- [x] finite status-based retention schedule adopted
- [x] `PRIVACY_NOTICE_URL=/polityka-prywatnosci`
- [x] `PRIVACY_NOTICE_VERSION=2026-08-20`
- [ ] final human read-through of the live privacy notice after launch

## Child protection

- [x] Standardy Ochrony Małoletnich v1.1 adopted
- [x] shortened child-friendly v1.1 adopted
- [x] full and shortened public routes available
- [ ] adopted full Standardy physically displayed/available in the Pozytywka premises as required by procedure
- [ ] adopted shortened Standardy physically displayed/available as required by procedure
- [ ] final human read-through of the live child-protection documents

## TEST / Preview

Canonical TEST Sheet ID:

`11-wmT8OCSVinFNjAFE7oHvIYUKnVOBgxmwIgvGgWH-8`

- [x] Preview uses isolated TEST identity
- [x] TEST notification/write path was previously verified
- [x] TEST historical outbox adoption completed safely
- [x] feature branches are not canonical TEST deployments
- [x] PR #84 merged the exact hardened Production tree into protected `preview`
- [x] `preview` commit `41a5eb7f65a49e27ef68aa6f28e251dc846976cb` has tree `c74a2e425d735b9cc5d8285e68acd8884331b4c0`, identical to Production `main` tree before this docs-only follow-up

## Human acceptance not replaced by CI

These remain explicit human checks. Do not mark them complete based only on Playwright:

- [ ] physical Android Chrome smoke
- [ ] physical iPhone Safari smoke
- [ ] keyboard-only full flow
- [ ] visible focus-ring review
- [ ] 200% zoom/reflow review
- [ ] final visual/contrast/readability review

## Post-launch architecture work

The launch is not claimed to solve the known limitations of Google Sheets as a transactional database/queue. Mandatory follow-up scope is maintained in `docs/AUDIT_REMEDIATION_2026-08-30.md`, including PostgreSQL transactional-core planning, atomic idempotency/outbox semantics, alerting, backup/restore, audit trail, schedule normalization, content snapshots and access governance.
