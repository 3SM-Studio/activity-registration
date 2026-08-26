# Release checklist

Date: 2026-08-26
Target: Pozytywka Registration v4
Status: Production deployed and command-level Production gates verified; intentionally closed pending remaining infrastructure/governance and physical/manual acceptance

`REGISTRATIONS_OPEN=TRUE` in Production is the final controlled release action. Until every blocking item below is closed, Production remains intentionally closed.

## Product and business

- [x] public user chooses city + public Offering, not internal Group
- [x] request requires human review/contact before confirmation
- [x] adult and minor flows supported
- [x] waiting-list workflow supported
- [x] season model implemented
- [x] rolling/windowed intake supported
- [x] production season 2026/2027 adopted
- [x] production city baseline adopted: Olkusz
- [x] production Offering baseline adopted
- [x] production Group baseline adopted
- [x] theatre intake window baseline adopted
- [x] contract/payment boundary documented

Canonical decisions: `docs/PRODUCTION_DECISIONS_2026-08-20.md`.

## Runtime and automated acceptance

- [x] schema v4 code deployed
- [x] `SEZONY`, `GRUPY`, `CURRENT_SEASON_ID`
- [x] v4 operator lifecycle fields
- [x] business duplicate handling
- [x] native Google Table `Rejestracje`
- [x] native `ASSIGNED_GROUP_ID` dropdown driven by current-season groups
- [x] `PANEL_OPERATORA` dashboard with group capacity formulas
- [x] four operator filter views
- [x] five actionable warning conditional-format rules on PROD `ZAPISY`
- [x] legacy whole-cell STATUS color conditional formats removed
- [x] native STATUS dropdown presentation left UI-owned
- [x] international phone input and controlled DOB picker
- [x] participant/admin transactional e-mail
- [x] durable notification outbox implemented
- [x] outbox retry/reconciliation and health diagnostics implemented
- [x] production runtime fails closed for wrong PROD Sheet or service-account identity
- [x] Google authentication provider errors sanitized before logging
- [x] PR #50 safe Sheet runtime/schema split passed full CI
- [x] PR #51 durable notification outbox passed `pnpm check`, Chrome verification and Critical E2E
- [x] PR #52 repository licensing/source-visible policy passed CI
- [x] release PR #54 passed full CI before promotion to `main`
- [x] PR #70 fixed locale-sensitive Google Sheets validation and passed full CI on `preview`
- [x] PR #71 promoted the exact validated fix to `main` and passed full CI
- [x] Production deployment gate on `main` SHA `01e07a11be2214bbf3fd4380dc2c34b3190ed4ba` passed `prod:env:validate`, `sheet:validate` and `diagnostics` before the normal Next.js build

## Notification reliability

- [x] `POWIADOMIENIA` contract contains technical identifiers/state only, no participant PII columns
- [x] stable confirmation/admin job IDs double as provider idempotency keys
- [x] `PENDING`, `SENDING`, `SENT`, `FAILED`, `SKIPPED` lifecycle
- [x] lease token + expiry
- [x] attempt counter and exponential backoff
- [x] `notifications:reconcile`
- [x] `notifications:retry`
- [x] safe one-time `notifications:adopt`
- [x] `diagnostics` fails on missing jobs, `FAILED`, or expired `SENDING` lease
- [x] TEST adoption performed while registrations were closed
- [x] four historical TEST registrations mapped to exactly eight `SKIPPED` jobs
- [x] no historical TEST notification resend during adoption
- [x] PROD outbox created and hard-protected after final code promotion to `main`
- [x] one historical PROD Registration mapped to exactly two terminal `SKIPPED` jobs
- [x] PROD adoption uses `PRE_OUTBOX_REGISTRATION`, `ATTEMPT_COUNT=0`, no retry schedule, lease or `SENT_AT`
- [x] PROD outbox health rechecked directly after adoption
- [x] durable-outbox issue #3 closed as completed after Production evidence

Canonical design: `docs/NOTIFICATION_OUTBOX.md`.

## Privacy / RODO

- [x] controller and operational contact baseline adopted
- [x] public privacy page implemented
- [x] lawful-basis model and balancing assessment documented
- [x] data minimization documented
- [x] processor/transfer model documented
- [x] access-control and data-subject procedures documented
- [x] finite status-based retention schedule adopted
- [x] quarterly retention review assigned to Iwona
- [x] `PRIVACY_NOTICE_URL=/polityka-prywatnosci`
- [x] `PRIVACY_NOTICE_VERSION=2026-08-20`

Canonical policy: `docs/RODO_AND_RETENTION_POLICY.md`.

## Child protection

- [x] Standardy Ochrony Małoletnich v1.1 adopted on 2026-08-21
- [x] shortened child-friendly v1.1 adopted on 2026-08-21
- [x] full and shortened public routes updated
- [x] reporting/accessibility/review requirements documented
- [ ] adopted full Standardy physically displayed in the Pozytywka premises
- [ ] adopted shortened Standardy physically displayed in the Pozytywka premises

Canonical documents:

- `docs/STANDARDY_OCHRONY_MALOLETNICH.md`
- `docs/STANDARDY_OCHRONY_MALOLETNICH_SKROT.md`

## Production Google Sheet

Canonical PROD Sheet ID:

`1DRcWvY8xfZDGjJLWOr8Ax1XsyBw4dWU8C6u9WGNvFfM`

- [x] separate PROD Sheet created
- [x] schema v4 structure verified
- [x] production catalog/settings verified
- [x] `SYSTEM_SCHEMA_VERSION=4`
- [x] `CURRENT_SEASON_ID=2026-2027`
- [x] `REGISTRATIONS_OPEN=FALSE` rechecked after outbox rollout on 2026-08-22
- [x] existing registration data preserved through v4 migration and outbox rollout
- [x] native `ASSIGNED_GROUP_ID` dropdown configured from eight active production groups
- [x] five warning conditional-format rules verified directly on 2026-08-22
- [x] `POWIADOMIENIA` created with the exact 13-column runtime contract
- [x] `POWIADOMIENIA` hard protection created for the dedicated PROD service account
- [x] historical PROD Registration count remained exactly one after adoption
- [x] dedicated PROD service account is the only application service account on PROD Sheet ACL
- [x] TEST service account absent from PROD Sheet ACL
- [x] PROD Sheet sharing restricted to explicit accounts
- [x] exact final PROD command-level `sheet:validate` through production Vercel identity on 2026-08-26, with zero warnings
- [x] exact final PROD command-level `diagnostics` through production Vercel identity on 2026-08-26 after outbox adoption: 2 jobs, 0 missing, 0 failed, 0 expired leases

Historical `ZAPISY` rows may retain older row-level schema versions. `SYSTEM_SCHEMA_VERSION=4` defines the current Sheet contract; historical values must not be fabricated merely to make all rows numerically identical.

## Production identity / hosting

Production service account:

`activity-registration-prod@pozytywka-reg-3sm-260819.iam.gserviceaccount.com`

TEST/Preview service account:

`activity-registration@pozytywka-reg-3sm-260819.iam.gserviceaccount.com`

- [x] dedicated PROD service account exists
- [x] PROD WIF binding previously verified as `environment:production`
- [x] TEST WIF binding previously verified as `environment:preview`
- [x] Vercel Production uses Google Sheets backend and canonical PROD identity
- [x] TEST identity is not present on PROD Sheet ACL
- [x] release PR #54 merged to `main` as `797ad4151a9511daddc3572c438f976b6df2f56b`
- [x] matching Vercel Production deployment `dpl_Cw2hmKfx6jKqwDCifjRkbd75ZyLc` reached `READY`
- [x] Vercel deployment metadata reports the exact same Production git SHA
- [x] post-rollout Production GET returned HTTP 200 and the closed-state UX
- [x] no warning/error/fatal logs found for the new Production deployment during post-rollout verification
- [x] PR #71 merged to `main` as `01e07a11be2214bbf3fd4380dc2c34b3190ed4ba`
- [x] matching Vercel Production deployment `dpl_8eEVcfawVZL3pixSDBdjkrWphcUP` reached `READY` for exactly that SHA
- [x] `pnpm prod:env:validate` ran inside the exact Vercel Production build environment and returned `ok: true`, including canonical Sheet, dedicated PROD identity, WIF and disabled test/catalog seeds
- [x] the same Production gate completed `sheet:validate` with zero warnings and `diagnostics` with zero outbox health failures
- [x] normal Next.js production build completed after the Production gate
- [x] post-deploy GET returned HTTP 200 and rendered `Zapisy są zamknięte` with `registrationsOpen=false`
- [x] no warning/error/fatal runtime logs and no runtime error clusters were found for the verified deployment after smoke
- [ ] broader Google Cloud IAM least-privilege review beyond Sheet ACL

## Security and abuse

- [x] JSON-only API
- [x] request body limit
- [x] honeypot
- [x] minimum fill time
- [x] server validation
- [x] PII-safe structured logging
- [x] no service-account private key in repo
- [x] Vercel OIDC/WIF architecture
- [x] hardened security headers and CSP baseline
- [x] WAF fixed-window rule previously verified at 10 requests / 60 seconds / IP with 429 after limit
- [x] Turnstile remains escalation rather than default friction
- [ ] GitHub `main`/`preview` branch protection or repository ruleset configured by an account with admin capability

## E-mail production

- [x] Resend provider enabled
- [x] custom production sender operational
- [x] participant delivery previously confirmed
- [x] admin delivery previously confirmed
- [x] canonical production admin recipient configured
- [x] durable outbox now replaces untracked best-effort failure handling
- [x] post-promotion PROD outbox adoption completed without historical resend
- [x] direct post-adoption health verification shows only two terminal `SKIPPED` legacy jobs and no failed/leased jobs

## TEST / Preview

Canonical TEST Sheet ID:

`11-wmT8OCSVinFNjAFE7oHvIYUKnVOBgxmwIgvGgWH-8`

- [x] Preview uses isolated TEST identity
- [x] controlled real submit/write previously verified
- [x] notification path previously verified
- [x] TEST returned to `REGISTRATIONS_OPEN=FALSE` on 2026-08-22
- [x] TEST outbox created/protected
- [x] historical TEST registrations safely adopted as `SKIPPED`
- [x] durable-outbox PR merged to `preview` as `59894364592e13932d2a3fcb0ab53f5ebae92806`
- [x] matching Vercel Preview deployment `dpl_59NB6WRR7v1qZceL5v1ew1dVn6my` reached `READY`
- [x] Vercel deployment metadata reports the exact same Preview git SHA
- [x] no Preview warning/error/fatal runtime logs found in the post-deploy check window

Vercel Authentication remains enabled for Preview. SSO redirect from an unauthenticated HTTP fetch is expected and is not treated as application failure.

## Manual acceptance

These checks require a real device or human operator and are not replaced by CI:

- [ ] physical Android Chrome, preferably Samsung
- [ ] physical iPhone Safari
- [ ] keyboard-only human flow
- [ ] visible focus-ring human review
- [ ] 200% zoom/reflow human review
- [ ] final human visual/contrast review
- [ ] final human read-through of privacy notice and adopted Standardy v1.1

## Remaining release sequence

Production code promotion, durable-outbox rollout and exact Production command-level validation are complete. Do not repeat the historical adoption. Re-run the command-level gate only when Production code, environment or Sheet contract changes.

1. complete broader Google Cloud IAM least-privilege review,
2. physically display both adopted Standardy versions,
3. complete remaining real-device, keyboard, focus, reflow, contrast and legal read-through acceptance,
4. configure GitHub `main`/`preview` repository protection/rulesets,
5. only then set Production `REGISTRATIONS_OPEN=TRUE`,
6. perform minimal live smoke and monitor without logging PII.
