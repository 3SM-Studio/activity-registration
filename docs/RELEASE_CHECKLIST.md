# Release checklist

This checklist reflects the approved v3 direction. Items marked complete describe verified foundations or completed preparatory work. v3 runtime/schema work remains staged.

## Product truth

- [x] canonical v3 product definition written
- [x] request is explicitly defined as requiring Pozytywka review/contact before place confirmation
- [x] public Offering is separated conceptually from internal Group
- [x] waiting-list workflow approved as product requirement
- [x] adult participant support remains required
- [x] full DOB has documented business purpose
- [ ] real city list approved by Iwona
- [ ] real offering list approved by Iwona
- [ ] real internal group catalog provided by Iwona
- [ ] exact theatre/window/casting rules confirmed
- [ ] prices/payment rules confirmed where relevant to later public copy
- [ ] contract-conclusion process confirmed
- [ ] resignation rules confirmed
- [ ] final success copy approved
- [ ] final public address/domain approved
- [ ] final visual layer approved by Pozytywka

## v3 domain/schema

- [ ] `SEZONY` implemented and validated
- [ ] `CURRENT_SEASON_ID` implemented
- [ ] `GRUPY` implemented as internal catalog
- [ ] Offering supports `ROLLING` / `WINDOWED`
- [ ] Offering supports `OPEN` / `WAITLIST_ONLY` / `CLOSED`
- [ ] window-date validation implemented
- [ ] v3 status enum implemented
- [ ] `ASSIGNED_GROUP_ID` implemented
- [ ] `CONTACTED_AT` implemented
- [ ] `CONFIRMED_AT` implemented
- [ ] `POSSIBLE_DUPLICATE_OF` implemented
- [ ] schema v2 -> v3 migration implemented and idempotent
- [ ] `SYSTEM_SCHEMA_VERSION=3` only after successful migration
- [ ] historical v1/v2 values preserved without fabrication

## Business deduplication

- [x] same-request `requestId` transport idempotency exists
- [ ] exact active business duplicate does not append a second row
- [ ] probable duplicate with changed contact is accepted and internally flagged
- [ ] different offering remains a valid separate request
- [ ] different season remains a valid separate request
- [ ] `REJECTED`/`CANCELLED` previous request may be resubmitted
- [ ] legacy row without DOB never hard-blocks using guessed identity
- [ ] reconciliation reports business duplicate candidates without logging PII
- [ ] concurrency limitation of Sheets dedupe is documented and accepted in implementation/tests

## Public UX

- [x] shadcn/Radix form foundation
- [x] international phone input + country flags + E.164 storage
- [x] shadcn DOB picker
- [x] name/email whitespace hygiene
- [x] minor/adult conditional guardian flow
- [x] E2E desktop/mobile coverage exists
- [ ] fake stepper removed/redesigned
- [ ] page explains mandatory review/contact before submit
- [ ] DOB description explains age-group matching purpose
- [ ] pre-submit copy says request is not place confirmation
- [ ] normal success screen explains what happens next
- [ ] exact-duplicate success screen is privacy-safe
- [ ] participant email explains mandatory review/contact
- [ ] admin email prioritizes operator data and probable-duplicate warning
- [ ] `Zapisz kolejne dziecko` flow implemented
- [ ] `Wyślij zgłoszenie na inne zajęcia` flow implemented
- [ ] no old request ID reuse in repeat flow

## Google Sheets / operator experience

- [x] separate TEST and PROD spreadsheets
- [x] TEST Sheet works from Vercel Preview through WIF
- [x] `ZAPISY` is a native Google Sheets Table
- [x] technical columns have warning-only protection in current schema
- [x] current `STATUS` and `NOTES` are operator-editable
- [ ] TEST backup created immediately before v3 migration
- [ ] TEST v3 migration verified on scratch/copy first
- [ ] `sheet:validate` green on migrated TEST
- [ ] `diagnostics` green on migrated TEST
- [ ] real-Google integration roundtrip green on migrated TEST
- [ ] operator-first column order/visibility implemented
- [ ] technical columns moved right or hidden for normal operator work
- [ ] v3 native status dropdown installed
- [ ] useful operator filter views documented/created
- [ ] probable duplicate visually visible to Iwona
- [ ] group assignment operator flow reviewed by Iwona
- [ ] PROD `sheet:validate` green
- [ ] PROD `diagnostics` green
- [ ] PROD access limited to approved operators + PROD service account
- [x] TEST service account has no PROD Sheet access

## TEST hygiene

- [x] TEST registrations set to `FALSE` outside controlled QA
- [x] pre-cleanup full spreadsheet backup created
- [x] manual/real-looking PII QA rows removed from `ZAPISY`
- [x] TEST `ZAPISY` now contains only an explicitly synthetic `example.com` fixture
- [x] routine QA policy requires synthetic fixtures only
- [ ] routine E2E does not send to real external participant mailboxes
- [x] feature-branch Vercel deployment root cause diagnosed
- [x] Vercel catch-all changed from `*` to `**` so slash branches are disabled
- [x] repository contract now protects the Vercel branch rule
- [x] commits after the `**` fix produced no feature-branch Vercel deployment
- [ ] canonical preview deployment SHA equals current GitHub `preview` before next product QA

## Privacy / RODO

- [ ] controller legal details verified directly with Iwona/current official registry
- [ ] registered/contact address confirmed before legal copy
- [ ] privacy-contact e-mail confirmed
- [ ] final privacy notice approved
- [ ] `PRIVACY_NOTICE_URL` configured in PROD
- [ ] `PRIVACY_NOTICE_VERSION` configured in PROD
- [ ] processing purposes documented
- [ ] legal bases reviewed/approved
- [ ] processor/recipient inventory documented, including Vercel, Google/Sheets, Resend and authorized humans
- [ ] access list approved
- [ ] retention periods/criteria approved for relevant outcomes
- [ ] retention procedure documented operationally
- [ ] data-subject request procedure documented
- [ ] `NOTES` sensitive-data policy documented for operators
- [x] no generic `Wyrażam zgodę na RODO` checkbox is required by product design
- [x] production remains fail-closed without privacy configuration

## Child protection / organization

- [ ] existence of applicable Standardy Ochrony Małoletnich confirmed
- [ ] full standard location/publication recorded
- [ ] child-friendly/shortened version status recorded where applicable
- [ ] instructor/personnel verification procedure confirmed
- [ ] required personnel checks confirmed operationally
- [ ] responsibility for responding to child-protection concerns is defined
- [x] child-protection personnel records are explicitly out of scope for `ZAPISY`

## Security

- [x] no private service-account key in repo/env flow
- [x] Preview OIDC/WIF works
- [x] public repo is intentional
- [x] `.env*` ignored except safe `.env.example`
- [x] PII-safe logging policy exists
- [x] JSON-only API / body limit / honeypot / minimum fill time exist
- [x] security headers exist
- [ ] separate PROD service account created
- [ ] production WIF subject bound only to PROD service account
- [ ] Preview identity cannot access PROD identity/resources
- [ ] final log review shows no PII leakage
- [ ] any previously exposed/test Resend key is revoked
- [ ] abuse-protection decision made before broad campaign/public launch
- [ ] rate limiting and/or Turnstile implemented if approved

## E-mail

- [x] participant confirmation transport works on TEST
- [x] admin notification transport works on TEST
- [x] e-mail failure does not roll back a persisted Registration
- [x] same-request replay does not resend notifications
- [ ] v3 participant copy approved and implemented
- [ ] v3 admin copy implemented
- [ ] admin mailbox delivery confirmed for final address
- [ ] production Resend sender approved
- [ ] final `REGISTRATION_ADMIN_EMAILS` configured

## UX / accessibility verification

- [x] automated desktop E2E foundation
- [x] automated 320 px coverage foundation
- [x] automated 430 px coverage foundation
- [x] Samsung-oriented regression coverage foundation
- [x] automated no-horizontal-overflow coverage foundation
- [ ] v3 full keyboard flow passes manually
- [ ] focus rings verified manually
- [ ] zoom/reflow and contrast checked manually
- [ ] physical Samsung Chrome smoke passes on v3
- [ ] iPhone Safari smoke passes on v3
- [ ] screen-reader spot check completed if practical

## Engineering

- [x] `pnpm-lock.yaml` exists
- [x] exact-pinned dependency policy
- [x] strict TypeScript baseline
- [x] `pnpm check` required before merge
- [x] full Playwright E2E required before merge
- [x] real-Google integration command is TEST-only
- [x] `docs/v3-product-truth` PR green and merged
- [ ] `chore/test-hygiene-and-preview` PR green and merged
- [ ] `feat/sheets-schema-v3-foundation` PR green and merged
- [ ] `feat/offering-intake-rules` PR green and merged
- [ ] `feat/registration-business-deduplication` PR green and merged
- [ ] `feat/registration-workflow-statuses` PR green and merged
- [ ] `feat/operator-sheets-experience` PR green and merged
- [ ] `feat/registration-copy-and-repeat-flow` PR green and merged
- [ ] `feat/group-catalog-operations` completed after real data exists
- [ ] privacy-retention readiness complete
- [ ] abuse-hardening decision/PR complete

Do not use stale fixed test-count numbers as a release gate. The current CI run is the source of truth for exact test counts.

## Production

- [ ] complete Vercel Production env configured
- [ ] Production uses PROD Sheet and separate PROD identity
- [ ] production catalog uses verified real data
- [ ] production privacy/legal gates complete
- [ ] controlled smoke test with `REGISTRATIONS_OPEN=FALSE`
- [ ] final form test without uncontrolled PROD data pollution
- [ ] all relevant gates above are closed
- [ ] only then set `REGISTRATIONS_OPEN=TRUE`
