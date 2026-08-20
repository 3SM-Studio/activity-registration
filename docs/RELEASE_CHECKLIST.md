# Release checklist

Date: 2026-08-20
Target: Pozytywka Registration v3

This checklist is the current source of truth after the production business/legal baseline was approved on 2026-08-20.

`REGISTRATIONS_OPEN=TRUE` in Production is the final action, not a prerequisite.

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
- [x] `CONFIRMED`, contact and unanswered-attempt semantics adopted
- [x] contract/payment boundary documented without turning the form into checkout
- [x] final public success/e-mail semantics approved as production baseline

Canonical decisions: `docs/PRODUCTION_DECISIONS_2026-08-20.md`.

## Runtime/domain

- [x] schema v3
- [x] `SEZONY`
- [x] `GRUPY`
- [x] `CURRENT_SEASON_ID`
- [x] v3 Offering intake fields
- [x] v3 registration statuses
- [x] `ASSIGNED_GROUP_ID`
- [x] `CONTACTED_AT`
- [x] `CONFIRMED_AT`
- [x] `POSSIBLE_DUPLICATE_OF`
- [x] exact active business duplicate no-op
- [x] probable duplicate flagging
- [x] legacy-safe duplicate behavior
- [x] native Google Tables retained
- [x] operator-first `ZAPISY`
- [x] semantic status formatting
- [x] filter views / duplicate signal
- [x] shadcn/Radix public form
- [x] international phone input
- [x] controlled DOB picker
- [x] repeat child/activity flows
- [x] participant/admin transactional e-mail
- [x] Pozytywka logo in e-mail header

## Privacy / RODO

- [x] controller baseline adopted
- [x] privacy/contact channel adopted
- [x] public production privacy page implemented
- [x] Article 6 basis model documented
- [x] Article 6(1)(f) balancing assessment documented
- [x] data minimization documented
- [x] no generic GDPR consent checkbox
- [x] processor inventory documented
- [x] transfer safeguards documented
- [x] access-control model documented
- [x] data-subject request procedure documented
- [x] `NOTES` sensitive-data policy documented
- [x] finite status-based retention schedule adopted
- [x] quarterly retention review assigned to Iwona
- [x] `PRIVACY_NOTICE_URL=/polityka-prywatnosci` in PROD Sheet
- [x] `PRIVACY_NOTICE_VERSION=2026-08-20` in PROD Sheet

Canonical policy: `docs/RODO_AND_RETENTION_POLICY.md`.

## Child protection

- [x] full Standardy Ochrony Małoletnich adopted
- [x] child-friendly shortened version adopted
- [x] owner/responsibility assigned to Iwona Pilarz
- [x] safe adult-child relations defined
- [x] prohibited conduct defined
- [x] child-child relations defined
- [x] electronic communication / Internet rules defined
- [x] intervention procedure defined
- [x] incident documentation procedure defined
- [x] support-plan procedure defined
- [x] personnel preparation procedure defined
- [x] Article 21 verification workflow documented
- [x] staff verification records explicitly excluded from registration Sheet/Git

Canonical documents:

- `docs/STANDARDY_OCHRONY_MALOLETNICH.md`
- `docs/STANDARDY_OCHRONY_MALOLETNICH_SKROT.md`

Operational evidence of each real staff check remains personnel documentation, not repository content.

## Production Google Sheet

Canonical PROD Sheet ID:

`1DRcWvY8xfZDGjJLWOr8Ax1XsyBw4dWU8C6u9WGNvFfM`

- [x] separate PROD Sheet created
- [x] copied from validated v3 structure to preserve native Tables/formatting
- [x] copied TEST participant rows removed from PROD
- [x] `ZAPISY` verified empty after cleanup
- [x] production city written
- [x] production season written
- [x] production Offerings written
- [x] production Groups written
- [x] production settings written
- [x] `SYSTEM_SCHEMA_VERSION=3`
- [x] `CURRENT_SEASON_ID=2026-2027`
- [x] `REGISTRATIONS_OPEN=FALSE`
- [x] guarded/reproducible production catalog seed added to repository
- [ ] repository `sheet:validate` executed using final PROD identity
- [ ] repository `diagnostics` executed using final PROD identity
- [ ] repository reconciliation executed using final PROD identity

## TEST finalization

- [x] canonical Preview uses v3 TEST
- [x] controlled real submit previously reached `201`
- [x] participant/admin notification path previously reported success
- [x] current Preview CI foundation green before this finalization PR
- [ ] remove manual real-delivery QA rows from TEST after final test session
- [ ] set TEST `REGISTRATIONS_OPEN=FALSE` after final test session
- [ ] final Preview HEAD real-Google validation evidence recorded

## Security and abuse

- [x] JSON-only API
- [x] request body limit
- [x] honeypot
- [x] minimum fill time
- [x] server validation
- [x] PII-safe structured logging
- [x] no service-account private key in repo
- [x] Vercel OIDC/WIF architecture
- [x] security headers
- [x] business dedupe kept separate from anti-abuse
- [x] WAF rate limiting selected as production volume-control strategy
- [x] Turnstile retained as escalation, not default friction
- [ ] Vercel WAF rule for `POST /api/registrations` physically created and verified
- [ ] final production logs checked for PII leakage

## Production identity / hosting

- [ ] separate PROD Google service account physically exists
- [ ] Production WIF subject bound only to the PROD service account
- [ ] PROD service account granted only required PROD Sheet access
- [ ] TEST identity verified without PROD access
- [ ] Vercel Production `APP_ENV=production`
- [ ] Vercel Production `DATA_BACKEND=google-sheets`
- [ ] Vercel Production points to canonical PROD Sheet
- [ ] complete Production WIF environment configured
- [ ] `ALLOW_TEST_SEED=false`
- [ ] `ALLOW_PRODUCTION_CATALOG_SEED=false` during normal runtime
- [ ] `pnpm prod:env:validate` passes against intended Production configuration

## E-mail production

- [x] Resend architecture retained
- [x] Resend DPA/subprocessor/transfer model reviewed in privacy policy
- [x] participant/admin rendering and transport covered by tests
- [x] failures do not roll back persisted registration
- [x] same-request replay does not resend notifications
- [x] admin recipient baseline: `pozytywka.boleslaw@gmail.com`
- [ ] production sender domain/address verified in Resend
- [ ] Production `EMAIL_FROM` configured with that verified sender
- [ ] Production `REGISTRATION_ADMIN_EMAILS` configured
- [ ] final participant delivery confirmed from Production configuration
- [ ] final admin delivery confirmed from Production configuration

## Manual acceptance

Automated gates must be green on the final PR/commit:

- [ ] `pnpm check`
- [ ] Critical E2E

Final physical/manual checks:

- [ ] desktop Chrome
- [ ] physical Android/Samsung Chrome
- [ ] iPhone Safari
- [ ] keyboard-only flow
- [ ] focus rings
- [ ] 200% zoom/reflow
- [ ] final visual/contrast check
- [ ] privacy page read-through
- [ ] Sheet operator flow using real production catalog

## Final release

Production can open only after every unchecked item above that depends on the actual hosting/IAM/mail environment has evidence.

Final sequence:

1. keep Production registrations closed,
2. configure separate PROD identity/WIF,
3. configure Vercel Production env,
4. configure verified Resend sender,
5. create and verify WAF rule,
6. run PROD validate/diagnostics/reconciliation,
7. run closed Production smoke and e-mail delivery check,
8. finish physical/manual QA,
9. verify final deployment SHA,
10. set Production `REGISTRATIONS_OPEN=TRUE`.
