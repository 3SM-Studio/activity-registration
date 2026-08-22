# Release checklist

Date: 2026-08-22
Target: Pozytywka Registration v4
Status: Production deployed and intentionally closed pending final physical/manual acceptance

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
- [ ] PROD outbox created/protected and historical Registration adopted after final code promotion to `main`
- [ ] PROD outbox health rechecked after adoption

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
- [x] `REGISTRATIONS_OPEN=FALSE` rechecked on 2026-08-22
- [x] existing registration data preserved through v4 migration
- [x] native `ASSIGNED_GROUP_ID` dropdown configured from eight active production groups
- [x] five warning conditional-format rules verified directly on 2026-08-22
- [x] dedicated PROD service account is the only application service account on PROD Sheet ACL
- [x] TEST service account absent from PROD Sheet ACL
- [x] PROD Sheet sharing restricted to explicit accounts
- [ ] exact final PROD command-level `sheet:validate` through production Vercel identity
- [ ] exact final PROD command-level `diagnostics` through production Vercel identity after outbox adoption

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
- [ ] broader Google Cloud IAM least-privilege review beyond Sheet ACL
- [ ] `pnpm prod:env:validate` against an exported copy of the exact final Production environment

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
- [ ] post-promotion PROD outbox adoption and health verification

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

## Final release sequence

1. promote verified `preview` to `main`,
2. wait for exact-SHA Production deployment to become `READY`,
3. keep PROD intake closed,
4. create/protect PROD `POWIADOMIENIA`,
5. adopt pre-outbox PROD Registration as `SKIPPED` without sending historical mail,
6. verify outbox counts/health and runtime logs,
7. complete remaining physical/manual/legal acceptance,
8. configure GitHub repository protection with admin access,
9. only then set Production `REGISTRATIONS_OPEN=TRUE`,
10. perform minimal live smoke and monitor without logging PII.
