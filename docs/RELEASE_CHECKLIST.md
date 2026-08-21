# Release checklist

Date: 2026-08-21
Target: Pozytywka Registration v3
Status: Production deployed and intentionally closed pending final physical/manual acceptance

`REGISTRATIONS_OPEN=TRUE` in Production is the final action. Until every remaining release blocker is closed, Production remains intentionally closed.

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

- [x] schema v3
- [x] `SEZONY`, `GRUPY`, `CURRENT_SEASON_ID`
- [x] v3 Offering intake fields and registration statuses
- [x] `ASSIGNED_GROUP_ID`, `CONTACTED_AT`, `CONFIRMED_AT`, `POSSIBLE_DUPLICATE_OF`
- [x] business duplicate handling
- [x] native Google Tables and operator-first `ZAPISY`
- [x] international phone input and controlled DOB picker
- [x] participant/admin transactional e-mail
- [x] production runtime fails closed for wrong PROD Sheet or service-account identity
- [x] Google authentication provider errors sanitized before logging
- [x] hardening PR #41 passed `pnpm check`, Chrome verification and Critical E2E
- [x] admin-recipient PR #42 passed full CI

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

- [x] v1.0 originally adopted on 2026-08-20
- [x] 2026 legal gap audit completed against current Article 22c
- [x] v1.1 prepared with explicit reporting channel
- [x] v1.1 covers children with disabilities and special educational needs
- [x] v1.1 includes documented periodic review rules
- [x] v1.1 requires full + shortened web publication and visible physical display
- [x] full Standardy v1.1 formally adopted by Iwona Pilarz on 2026-08-21
- [x] shortened child-friendly v1.1 formally adopted by Iwona Pilarz on 2026-08-21
- [x] v1.1 effective date: 2026-08-21
- [x] canonical full repository document updated to v1.1
- [x] canonical shortened repository document updated to v1.1
- [x] public full route updated to v1.1
- [x] public child-friendly route updated to v1.1
- [ ] adopted full Standardy physically displayed in the Pozytywka premises
- [ ] adopted shortened Standardy physically displayed in the Pozytywka premises

Canonical documents:

- full: `docs/STANDARDY_OCHRONY_MALOLETNICH.md`
- shortened: `docs/STANDARDY_OCHRONY_MALOLETNICH_SKROT.md`

Previous versions remain recoverable from Git history. Personnel verification and incident documentation remain outside the registration Sheet and repository.

## Production Google Sheet

Canonical PROD Sheet ID:

`1DRcWvY8xfZDGjJLWOr8Ax1XsyBw4dWU8C6u9WGNvFfM`

- [x] separate PROD Sheet created
- [x] v3 structure and native Tables verified
- [x] production catalog/settings verified
- [x] `SYSTEM_SCHEMA_VERSION=3`
- [x] `CURRENT_SEASON_ID=2026-2027`
- [x] `REGISTRATIONS_OPEN=FALSE` during release preparation
- [x] real Vercel Production registration previously matched to the canonical PROD Sheet
- [x] synthetic smoke registration removed after verification
- [x] `ZAPISY` returned to header-only state after smoke cleanup
- [x] old TEST/general service account removed from PROD Sheet ACL on 2026-08-21
- [x] PROD Sheet general access verified as restricted
- [ ] repository `sheet:validate` command executed through the exact final PROD Vercel identity
- [ ] repository `diagnostics` command executed through the exact final PROD Vercel identity

The command-level checks are not replaced by a public debug endpoint. Direct Sheet validation plus a proven real Vercel-runtime write provide the current runtime evidence without creating a temporary production attack surface.

## Production identity / hosting

Production service account:

`activity-registration-prod@pozytywka-reg-3sm-260819.iam.gserviceaccount.com`

TEST/Preview service account:

`activity-registration@pozytywka-reg-3sm-260819.iam.gserviceaccount.com`

- [x] dedicated PROD Google service account exists
- [x] PROD service account is the only application service account on the PROD Sheet ACL
- [x] PROD WIF service-account binding independently verified as `environment:production`
- [x] TEST WIF service-account binding independently verified as `environment:preview`
- [x] TEST service-account binding does not contain `environment:production`
- [x] WIF issuer independently verified: `https://oidc.vercel.com/atypicalmichas`
- [x] WIF allowed audience independently verified as the canonical provider resource
- [x] Vercel Production uses `APP_ENV=production`
- [x] Vercel Production uses `DATA_BACKEND=google-sheets`
- [x] Vercel Production points at the canonical PROD Sheet
- [x] Vercel Production uses the dedicated PROD service account
- [x] `ALLOW_TEST_SEED=false` verified in Vercel Production
- [x] `ALLOW_PRODUCTION_CATALOG_SEED=false` verified in Vercel Production
- [ ] broader Google IAM/Drive access for the PROD service account independently reviewed for least privilege beyond the Sheet
- [ ] `pnpm prod:env:validate` executed against an exported copy of the exact final Production environment

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
- [x] WAF strategy selected for production volume control
- [x] Vercel WAF rule created for `POST /api/registrations`
- [x] WAF fixed window configured: 10 requests / 60 seconds / IP
- [x] WAF action configured as `429 Too Many Requests`
- [x] WAF physically verified on 2026-08-21: requests 1-10 reached the app, requests 11-12 returned `429`
- [x] Turnstile remains an escalation option rather than default friction

## E-mail production

- [x] Resend provider enabled
- [x] custom production sender operational: `Pracownia Twórcza Pozytywka <zapisy@3stupidmen.com>`
- [x] real participant delivery previously confirmed
- [x] notification transport previously confirmed from Production
- [x] canonical production admin recipient changed in code to `michal.szwindowski@gmail.com`
- [x] `REGISTRATION_ADMIN_EMAILS` Production environment changed to `michal.szwindowski@gmail.com`
- [x] final admin-recipient deployment is READY on commit `80d4fba8059215e2382c0391f6e8230c412a9726`
- [ ] one final admin notification delivered to `michal.szwindowski@gmail.com` from the final Production configuration

The public Pozytywka contact mailbox remains a separate business decision and does not have to equal the technical registration-notification recipient.

## TEST / Preview

- [x] canonical Preview architecture uses the TEST service account
- [x] TEST identity independently verified as `environment:preview`
- [x] controlled real submit previously reached `201`
- [x] participant/admin notification path previously reported success
- [x] manual real-delivery QA rows removed after testing
- [ ] final canonical Preview HEAD real-Google validation evidence recorded after the v1.1 publication release

## Manual acceptance

These checks require a real device or human operator and are not replaced by CI:

- [ ] physical Android Chrome, preferably Samsung
- [ ] physical iPhone Safari
- [ ] keyboard-only human flow
- [ ] visible focus-ring human review
- [ ] 200% zoom/reflow human review
- [ ] final human visual/contrast review
- [ ] final human read-through of privacy notice and adopted Standardy v1.1
- [ ] Sheet operator flow using the real production catalog

## Final release sequence

Production may open only after the remaining real-world blockers are closed.

1. deploy adopted v1.1 while registrations remain closed,
2. verify public full + child-friendly routes show v1.1,
3. physically display both adopted Standardy versions in the premises,
4. complete final real-device accessibility/form QA,
5. complete operator Sheet QA,
6. confirm one final admin notification to `michal.szwindowski@gmail.com`,
7. execute remaining environment-specific command checks where credentials can be safely obtained,
8. only then set Production `REGISTRATIONS_OPEN=TRUE`,
9. perform the final live smoke and immediately remove any synthetic production record.
