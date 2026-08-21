# Release checklist

Date: 2026-08-21
Target: Pozytywka Registration v3

This checklist is the current release truth after production hardening and direct verification against GitHub CI, Vercel Production, Gmail delivery evidence and the canonical Production Google Sheet.

`REGISTRATIONS_OPEN=TRUE` in Production is the final action, not a prerequisite. Until every release blocker is closed, Production remains intentionally closed.

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
- [x] `ASSIGNED_GROUP_ID` native dropdown for the adopted 2026/2027 Group IDs
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
- [x] repeat participant/activity flows
- [x] participant/admin transactional e-mail
- [x] Pozytywka logo in e-mail header
- [x] production runtime now fails closed for the wrong PROD Sheet or service-account identity
- [x] Google authentication provider errors are sanitized before application/platform logging

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

- [x] full Standardy Ochrony Małoletnich v1.0 adopted on 2026-08-20
- [x] child-friendly shortened v1.0 adopted on 2026-08-20
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
- [x] 2026 legal gap audit completed against Article 22c
- [x] v1.1 draft prepared with explicit reporting channel, disability/SEN accommodations, documented review and publication rules
- [x] public full + child-friendly web routes implemented in the hardening release
- [ ] v1.1 formally adopted by Iwona Pilarz
- [ ] adopted full + shortened Standardy physically displayed in the premises

Canonical documents:

- adopted v1.0: `docs/STANDARDY_OCHRONY_MALOLETNICH.md`
- adopted shortened v1.0: `docs/STANDARDY_OCHRONY_MALOLETNICH_SKROT.md`
- pending replacement: `docs/STANDARDY_OCHRONY_MALOLETNICH_V1.1_DRAFT.md`

Operational evidence of each real staff check remains personnel documentation, not repository content.

## Production Google Sheet

Canonical PROD Sheet ID:

`1DRcWvY8xfZDGjJLWOr8Ax1XsyBw4dWU8C6u9WGNvFfM`

- [x] separate PROD Sheet created
- [x] copied from validated v3 structure to preserve native Tables/formatting
- [x] production headers directly re-verified against the v3 contract on 2026-08-21
- [x] production catalog/settings values directly re-verified on 2026-08-21
- [x] `ZAPISY` verified header-only after final smoke cleanup on 2026-08-21
- [x] production city written
- [x] production season written
- [x] production Offerings written
- [x] production Groups written
- [x] production settings written
- [x] `SYSTEM_SCHEMA_VERSION=3`
- [x] `CURRENT_SEASON_ID=2026-2027`
- [x] `REGISTRATIONS_OPEN=FALSE` during hardening
- [x] native table ranges synchronized to all current catalog/settings rows
- [x] `OFERTY_ZAJEC` and `GRUPY` rows verified inside their native Tables after resize
- [x] production `ASSIGNED_GROUP_ID` configured as a native Table dropdown
- [x] synthetic `appendCells(tableId=900001)` smoke verified a new row stays inside `Rejestracje`
- [x] smoke row inherited table banding, date typing and semantic `NEW` formatting
- [x] guarded/reproducible production catalog seed added to repository
- [x] catalog seed commands re-run `sheet:bootstrap` so native table ranges cannot remain stale after reseed
- [x] real Vercel Production `201` registration ID was matched to the canonical PROD Sheet, proving the deployed runtime writes to this spreadsheet
- [x] final synthetic Production smoke registration removed after verification
- [x] reconciliation equivalent is currently clean because Production `ZAPISY` has zero data rows
- [ ] repository `sheet:validate` command executed through the final PROD Vercel identity
- [ ] repository `diagnostics` command executed through the final PROD Vercel identity

The remaining two command-level checks are deliberately not replaced by a public debug endpoint. Direct Sheet validation plus a real Vercel-runtime write already provide the relevant structural and runtime evidence without creating a temporary production attack surface.

## TEST finalization

- [x] canonical Preview uses v3 TEST
- [x] controlled real submit previously reached `201`
- [x] participant/admin notification path previously reported success
- [x] manual real-delivery QA rows removed after the final test session
- [x] only the explicit synthetic fixture remains in TEST `ZAPISY`
- [x] seed command re-runs `sheet:bootstrap` so supporting native Tables resize after reseed
- [ ] final canonical Preview HEAD real-Google validation evidence recorded for this hardening release

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
- [x] CSP baseline includes blocked object/frame embedding and self-only manifest/base/form targets
- [x] business dedupe kept separate from anti-abuse
- [x] WAF rate limiting selected as production volume-control strategy
- [x] Turnstile retained as escalation, not default friction
- [x] final Production application logs for a real successful registration checked for PII leakage
- [ ] Vercel WAF rule for `POST /api/registrations` physically created and verified

## Production identity / hosting

- [x] separate PROD Google service account physically exists and is present on the PROD Sheet ACL
- [x] Vercel Production is operational with `APP_ENV=production`
- [x] Vercel Production is operational with `DATA_BACKEND=google-sheets`
- [x] Vercel Production was proven to write to the canonical PROD Sheet
- [x] complete Production WIF configuration is operational, because the deployed Vercel runtime successfully authenticated to Google Sheets without a private key
- [x] hardening code rejects a wrong PROD Sheet/service-account configuration at runtime
- [ ] Production WIF subject/provider binding independently verified to permit only the dedicated PROD service account
- [ ] old TEST/general service account removed from PROD Sheet access
- [ ] TEST identity independently verified without PROD access
- [ ] PROD service account's broader Google IAM/Drive access independently confirmed least-privilege beyond this Sheet
- [ ] `ALLOW_TEST_SEED=false` explicitly verified in Vercel Production configuration
- [ ] `ALLOW_PRODUCTION_CATALOG_SEED=false` explicitly verified in Vercel Production configuration
- [ ] `pnpm prod:env:validate` executed against the exact final Vercel Production environment

Known blocker: `activity-registration@pozytywka-reg-3sm-260819.iam.gserviceaccount.com` still has `writer` on the PROD Sheet. It must be removed before registrations are opened.

## E-mail production

- [x] Resend architecture retained
- [x] Resend DPA/subprocessor/transfer model reviewed in privacy policy
- [x] participant/admin rendering and transport covered by tests
- [x] failures do not roll back persisted registration
- [x] same-request replay does not resend notifications
- [x] admin recipient baseline: `pozytywka.boleslaw@gmail.com`
- [x] Production sender is operational on the custom address `Pracownia Twórcza Pozytywka <zapisy@3stupidmen.com>`
- [x] Production `EMAIL_FROM` custom sender proven by a real delivered message
- [x] final participant delivery confirmed from Production configuration on 2026-08-21
- [x] Production notification transport reported success for the corresponding real registration
- [ ] final admin mailbox delivery independently confirmed

The delivered Production participant message is stronger operational evidence than merely checking a provider dashboard flag: the custom sender was accepted and the message reached the recipient mailbox.

## Automated acceptance

Final PR head must be green:

- [x] `pnpm check` on PR #41 / hardening head
- [x] system Chrome verification in CI
- [x] Critical E2E on PR #41 / hardening head

## Manual acceptance

Checks that require a real browser/device/operator and therefore cannot be truthfully simulated by CI:

- [ ] physical Android/Samsung Chrome
- [ ] physical iPhone Safari
- [ ] keyboard-only human flow
- [ ] focus-ring human review
- [ ] 200% zoom/reflow human review
- [ ] final human visual/contrast review
- [ ] privacy/Standardy final human read-through
- [ ] Sheet operator flow using the real production catalog

CI already covers desktop Chromium behavior and mobile-sized Chromium viewports, but that is not equivalent to physical Safari/Android or a human accessibility review.

## Final release

Production can open only after every remaining blocker that can affect security, child protection, production identity or real-world operation has evidence.

Final sequence:

1. merge/deploy this hardening release while Production registrations remain closed,
2. verify the deployed Production SHA and public legal routes,
3. remove the old general/TEST service account from PROD Sheet access and verify TEST cannot access PROD,
4. independently verify the Production WIF binding and normal-runtime seed flags,
5. create/verify the Vercel WAF rate-limit rule,
6. formally adopt v1.1 and display the adopted full + shortened Standardy in the premises,
7. independently confirm admin mailbox delivery,
8. complete physical/manual QA and operator Sheet flow,
9. run any remaining environment-specific validation commands where access exists,
10. only then set Production `REGISTRATIONS_OPEN=TRUE`.
