# Release checklist

This checklist distinguishes **implemented engineering**, **TEST verification** and **external/production gates**.

A checked engineering item does not mean production is approved. `REGISTRATIONS_OPEN=TRUE` remains forbidden until every blocking Production item is complete.

## Product truth

- [x] canonical v3 product definition written
- [x] request is explicitly defined as requiring Pozytywka review/contact before place confirmation
- [x] public Offering is separated from internal Group
- [x] waiting-list workflow is part of the product
- [x] adult participant support remains required
- [x] full DOB has a documented business purpose
- [ ] real production city list approved by Iwona
- [ ] real production Offering list approved by Iwona
- [ ] real internal Group catalog provided by Iwona
- [ ] exact theatre/window/casting rules confirmed where relevant
- [ ] prices/payment rules confirmed if they will affect later public copy
- [ ] contract-conclusion process confirmed
- [ ] resignation rules confirmed
- [ ] final public success/e-mail copy approved by Pozytywka
- [ ] final public address/domain approved
- [ ] final visual/business acceptance by Pozytywka

## v3 domain/schema implementation

- [x] `SEZONY` implemented
- [x] `CURRENT_SEASON_ID` implemented
- [x] `GRUPY` schema implemented as internal catalog
- [x] Offering supports `ROLLING` / `WINDOWED`
- [x] Offering supports `OPEN` / `WAITLIST_ONLY` / `CLOSED`
- [x] public `UPCOMING` derivation implemented
- [x] window-date/configuration validation implemented
- [x] v3 status enum implemented
- [x] `ASSIGNED_GROUP_ID` implemented
- [x] `CONTACTED_AT` implemented
- [x] `CONFIRMED_AT` implemented
- [x] `POSSIBLE_DUPLICATE_OF` implemented
- [x] schema v2 -> v3 migration implemented and idempotent
- [x] `SYSTEM_SCHEMA_VERSION=3` is the executable contract
- [x] migration sets v3 only after required structure succeeds
- [x] historical v1/v2 values are preserved without fabrication
- [x] canonical TEST Preview currently reads v3 season/intake data successfully

## Business deduplication

- [x] same-request `requestId` transport idempotency exists
- [x] exact active business duplicate does not append a second row
- [x] probable duplicate with changed contact is accepted and internally flagged
- [x] different Offering remains a valid separate request
- [x] different Season remains a valid separate request
- [x] previous `REJECTED`/`CANCELLED` may be resubmitted
- [x] legacy row without reliable DOB never hard-blocks using guessed identity
- [x] reconciliation can report business duplicate candidates without logging PII
- [x] Sheets concurrency limitation is documented and tested as soft deduplication

## Public UX

- [x] shadcn/Radix form foundation
- [x] international phone input + country flags + E.164 storage
- [x] shadcn/Radix DOB picker
- [x] name/e-mail whitespace hygiene
- [x] minor/adult conditional guardian flow
- [x] desktop/mobile Playwright coverage
- [x] fake stepper removed
- [x] page explains mandatory review/contact
- [x] DOB description explains age-group matching + guardian purpose
- [x] pre-submit copy says request is not place confirmation
- [x] normal success screen explains what happens next
- [x] exact-duplicate success screen is privacy-safe
- [x] participant e-mail explains mandatory review/contact and no place confirmation
- [x] admin e-mail prioritizes operator data and probable-duplicate warning
- [x] `Zapisz kolejne dziecko` flow implemented
- [x] `Zgłoś inne zajęcia` flow implemented
- [x] repeat flows generate a new `requestId`
- [x] repeat-flow data preservation/clearing has E2E coverage
- [x] automated keyboard flow is covered

## Google Sheets / operator experience

- [x] separate TEST and PROD spreadsheet model exists
- [x] canonical Preview reads TEST through WIF
- [x] TEST service account is documented/kept as TEST-only identity
- [x] `ZAPISY` is native Google Sheets Table `Rejestracje`
- [x] technical columns have protection metadata
- [x] operator workflow fields remain editable
- [x] operator-first visibility implemented
- [x] technical columns hidden/moved out of normal operator work
- [x] v3 native status dropdown/formatting implemented
- [x] operator filter views implemented/documented
- [x] probable duplicate has an operator-visible signal
- [x] group assignment field is structurally ready
- [ ] Iwona has reviewed the operator Sheet workflow with real operational data
- [ ] real Group dropdown/assignment UX reviewed after real groups exist

### TEST Google verification before final QA

These are execution/evidence gates, not missing source-code features:

- [x] TEST registrations are closed outside controlled QA
- [x] v3 TEST catalog is readable from canonical Preview
- [ ] fresh `sheet:validate` evidence recorded for the final Preview HEAD
- [ ] fresh `diagnostics` evidence recorded for the final Preview HEAD
- [ ] fresh TEST-only real-Google integration roundtrip recorded for the final Preview HEAD
- [ ] fresh reconciliation evidence recorded for the final Preview HEAD

### PROD Google verification

- [ ] separate PROD Sheet exists and is backed up before migration
- [ ] PROD schema v3 migration/bootstrap completed with registrations closed
- [ ] PROD `sheet:validate` green
- [ ] PROD `diagnostics` green
- [ ] PROD access limited to approved operators + PROD service account
- [ ] Preview identity is verified not to have unintended PROD access

## TEST hygiene

- [x] TEST registrations default to `FALSE` outside controlled QA
- [x] pre-cleanup full spreadsheet backup was created
- [x] manual/real-looking PII QA rows were removed from `ZAPISY`
- [x] retained TEST fixtures are explicitly synthetic
- [x] routine QA policy requires synthetic identities/contact data
- [x] routine Playwright uses memory/test providers and does not send participant mail externally
- [x] feature-branch Vercel deployment root cause diagnosed
- [x] Vercel catch-all uses `**` so slash feature branches are disabled
- [x] repository contract protects the Vercel branch rule
- [x] post-fix feature commits were observed without unwanted feature deployments
- [ ] immediately before each manual QA cycle, canonical deployment SHA is rechecked against GitHub `preview`

## Privacy / RODO engineering readiness

- [x] registration processing purpose documented
- [x] current data categories/minimization documented
- [x] processor/recipient inventory framework documented for Vercel, Google/Sheets, Resend and humans
- [x] production access-control procedure documented
- [x] data-subject request procedure documented
- [x] `NOTES` sensitive-data policy documented
- [x] retention decision contract documented without inventing a duration
- [x] TEST PII policy documented
- [x] no generic `Wyrażam zgodę na RODO` checkbox is used as a fake legal basis
- [x] production remains fail-closed without required privacy configuration

### Privacy / RODO external approval

- [ ] controller legal details verified against current official data
- [ ] registered/contact address confirmed
- [ ] privacy-contact e-mail confirmed
- [ ] final privacy notice approved
- [ ] legal basis/bases approved
- [ ] retention criteria approved for relevant outcomes
- [ ] final named production access list approved
- [ ] final processor/transfer information reviewed
- [ ] `PRIVACY_NOTICE_URL` configured in PROD
- [ ] `PRIVACY_NOTICE_VERSION` configured in PROD

## Child protection / organization

Engineering contract:

- [x] child-protection evidence is a release gate, not an extra public form checkbox
- [x] personnel criminal-record/verification documents are out of scope for `ZAPISY`

External confirmation:

- [ ] applicable Standardy Ochrony Małoletnich confirmed
- [ ] full standard location/publication recorded
- [ ] child-friendly/shortened version status recorded where applicable
- [ ] instructor/personnel verification procedure confirmed
- [ ] required personnel checks confirmed operationally
- [ ] responsibility for responding to concerns defined

## Security / abuse

- [x] no private service-account key in repo/env flow
- [x] Preview OIDC/WIF works
- [x] public repo is intentional
- [x] `.env*` ignored except safe `.env.example`
- [x] PII-safe logging policy exists
- [x] JSON-only API / body limit / honeypot / minimum fill time exist
- [x] security headers exist
- [x] abuse-protection decision is documented
- [x] WAF rate limiting is selected as primary public volume protection
- [x] application abuse-path E2E covers honeypot and too-fast submissions
- [x] abuse telemetry contract forbids participant PII
- [x] Turnstile is a documented escalation rather than default UX
- [ ] Vercel WAF rule for `POST /api/registrations` is created
- [ ] WAF controlled closed-registration test returns `429` after threshold
- [ ] WAF does not block ordinary form traffic
- [ ] separate PROD service account created
- [ ] Production WIF subject bound only to PROD service account
- [ ] final PROD/Preview access-boundary review complete
- [ ] final production log review shows no PII leakage
- [ ] any previously exposed/test Resend key is revoked if applicable

## E-mail

- [x] participant confirmation transport works on TEST foundation
- [x] admin notification transport works on TEST foundation
- [x] e-mail failure does not roll back persisted Registration
- [x] same-request replay does not resend notifications
- [x] v3 participant copy implemented
- [x] v3 admin copy implemented
- [ ] final copy approved by Pozytywka
- [ ] production Resend sender/domain approved and configured
- [ ] final `REGISTRATION_ADMIN_EMAILS` configured
- [ ] delivery to final admin mailbox confirmed

## UX / accessibility verification

Automated:

- [x] desktop E2E foundation
- [x] 320 px coverage
- [x] 430 px coverage
- [x] Samsung-oriented regression coverage
- [x] no-horizontal-overflow coverage
- [x] keyboard/repeat-flow automated coverage

Manual final acceptance:

- [ ] focus rings verified manually
- [ ] zoom/reflow checked manually
- [ ] contrast/visual acceptance checked manually
- [ ] physical Samsung Chrome smoke passes on final v3
- [ ] iPhone Safari smoke passes on final v3
- [ ] screen-reader spot check completed if practical

## Engineering roadmap

- [x] PR 0 `docs/v3-product-truth` merged (#16)
- [x] PR 1 TEST hygiene/Preview hardening merged (#17)
- [x] PR 2 schema v3 foundation merged (#18)
- [x] PR 3 Offering intake rules merged (#20)
- [x] PR 4 business deduplication merged (#21)
- [x] PR 5 workflow statuses merged (#22)
- [x] PR 6 operator Sheets experience merged (#23)
- [x] PR 7 registration copy/repeat flow merged (#25)
- [ ] PR 8 real Group catalog/operations, blocked until Iwona supplies real data
- [x] PR 9 implementable privacy/retention readiness merged (#26)
- [x] PR 10 abuse-hardening source/test work merged (#27)
- [ ] PR 11 production-readiness engineering PR merged

Repository quality policy:

- [x] `pnpm-lock.yaml` exists
- [x] dependencies exact-pinned
- [x] strict TypeScript baseline
- [x] `pnpm check` is a merge gate
- [x] full Playwright E2E is a merge gate
- [x] real-Google integration command is TEST-only
- [x] production environment has fail-closed parsing/tests
- [x] secret-safe `pnpm prod:env:validate` preflight exists in PR11

Do not use stale fixed test-count numbers. Current CI is the source of truth.

## Production

- [ ] final business/catalog inputs approved
- [ ] privacy/legal/child-protection gates complete
- [ ] separate PROD Sheet ready on schema v3
- [ ] separate PROD service account and Production WIF ready
- [ ] complete Vercel Production env configured
- [ ] `pnpm prod:env:validate` passes with intended Production configuration
- [ ] production Resend sender/admin recipients verified
- [ ] PROD Sheet access review complete
- [ ] Vercel WAF rule configured and verified
- [ ] controlled smoke performed with `REGISTRATIONS_OPEN=FALSE`
- [ ] manual final device/accessibility checks complete
- [ ] final canonical release commit/deployment evidence recorded
- [ ] all blocking items above are complete
- [ ] only then set `REGISTRATIONS_OPEN=TRUE`
