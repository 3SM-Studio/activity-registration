# Production hardening - 2026-08-21

Status: **PRODUCTION CLOSED / RELEASE BLOCKED ONLY BY EXTERNAL OR HUMAN GATES**

This document records evidence gathered after the v3 release-readiness audit. It does not replace `docs/RELEASE_CHECKLIST.md`; it explains why the remaining unchecked external gates stay blocking.

## Immediate containment

- Canonical PROD Sheet: `1DRcWvY8xfZDGjJLWOr8Ax1XsyBw4dWU8C6u9WGNvFfM`.
- `REGISTRATIONS_OPEN` was explicitly changed from `TRUE` to `FALSE` on 2026-08-21 during hardening.
- Production `ZAPISY` was returned to a header-only state after the final synthetic smoke registration was verified and removed.
- Production must stay closed until every release blocker below has evidence.

## Confirmed production evidence

### Runtime

The production environment completed a real `POST /api/registrations` with HTTP `201` and subsequently logged `registration.notifications.succeeded`.

The application-level success log contained technical identifiers and state flags only. No participant name, guardian name, phone, e-mail, address or request body was present in the inspected success path.

The exact `registrationId` from that Vercel Production success log was found in the canonical PROD Sheet before cleanup. This proves that the deployed Vercel runtime was writing to the intended Production spreadsheet rather than TEST.

### Google Sheet

The canonical PROD Sheet exists and includes the dedicated service account:

`activity-registration-prod@pozytywka-reg-3sm-260819.iam.gserviceaccount.com`

with writer access.

The Production schema headers, catalog, season, groups, settings and typed registration columns were directly re-inspected against the v3 contracts on 2026-08-21. `SYSTEM_SCHEMA_VERSION=3`, `CURRENT_SEASON_ID=2026-2027` and `REGISTRATIONS_OPEN=FALSE` are present.

However, the older account:

`activity-registration@pozytywka-reg-3sm-260819.iam.gserviceaccount.com`

also still has writer access. This violates the intended TEST/PROD separation. An attempted permission downgrade through the available Drive connector did not change the existing writer role. The old writer permission must be removed using a Drive/IAM administration surface that supports permission deletion or update.

### E-mail

A real Production participant message was delivered to the connected mailbox from:

`Pracownia Twórcza Pozytywka <zapisy@3stupidmen.com>`

for the same verified smoke registration. This proves the deployed custom `EMAIL_FROM` is operational and participant delivery works from Production. The corresponding runtime also logged `registration.notifications.succeeded`.

Independent mailbox-level evidence for the administrative recipient remains outstanding because that mailbox is not connected to the available tools.

### CI

The hardening PR passed the repository quality gate and Critical E2E before the final documentation-truth cleanup. Every final HEAD must repeat the same CI successfully before merge.

## Hardening implemented in code

- Production runtime requires the canonical PROD Sheet and the dedicated PROD service account.
- Production environment validation additionally rejects the Resend testing domain and an unexpected admin-recipient baseline.
- Normal runtime must not have `ALLOW_PRODUCTION_CATALOG_SEED=true`.
- Google authentication failures are converted to a fixed safe application error before they can escape to Next/Vercel error handling; the original provider error is intentionally not retained as `cause`.
- A regression test verifies that fake `subject_token` and provider details do not survive sanitization.
- Public form semantics were hardened: related activity controls are grouped, custom required controls expose `aria-required`, required-field instructions precede the first field, and contact copy stays neutral until age is known.
- Adult and minor repeat-registration CTAs no longer use misleading copy.
- Reduced-motion behavior is targeted instead of globally forcing every transition and animation to `0.01ms`.
- The existing modal shadcn/Radix date picker architecture is retained and duplicate blur handling was removed.
- Public privacy, child-protection and contact navigation is available from the form and closed states.
- Full and child-friendly currently adopted Standardy v1.0 have public routes prepared.
- Response-header baseline additionally blocks objects and frames without introducing a nonce-based CSP that could silently change Next.js rendering architecture.
- Production env parsing fails closed when the Sheet or service-account identity does not match the canonical Production configuration.

## Child-protection legal review

Research against the consolidated 2026 text of the Act identified a gap in adopted Standardy v1.0: art. 22c(4) requires the standards to take into account children with disabilities and children with special educational needs. The same review confirmed the need for written review documentation and publication of both full and shortened versions on the website and visibly in the premises.

The adopted v1.0 documents remain unchanged in:

- `docs/STANDARDY_OCHRONY_MALOLETNICH.md`
- `docs/STANDARDY_OCHRONY_MALOLETNICH_SKROT.md`

Proposed replacements are isolated from the adopted documents in:

- `docs/STANDARDY_OCHRONY_MALOLETNICH_V1.1_DRAFT.md`
- `docs/STANDARDY_OCHRONY_MALOLETNICH_SKROT_V1.1_DRAFT.md`

The v1.1 proposal adds:

- an explicit reporting channel,
- accessible communication and intervention rules for children with disabilities and special educational needs,
- explicit written documentation of the required periodic review,
- explicit publication of full and shortened versions on the website and visibly in the premises.

**The proposed v1.1 is not formally adopted by code, Git history or this document.** Iwona Pilarz must approve it as the responsible process owner before it is presented as the operative version.

## Remaining release blockers

### Google / identity

- [ ] Remove the old `activity-registration@...` writer permission from the PROD Sheet.
- [ ] Verify the Production WIF subject/provider binding permits only the intended Production workload to impersonate the dedicated PROD service account.
- [ ] Verify the TEST/Preview identity cannot write to the PROD Sheet.
- [ ] Independently confirm the dedicated PROD service account has no unnecessary broader access outside the required Production resources.
- [ ] Execute `pnpm prod:env:validate` against the exact final Vercel Production environment if/when an authenticated environment-execution surface is available.

Direct Production Sheet structure validation and a real Vercel-runtime write are already green. A temporary public debug endpoint is intentionally not introduced merely to execute command names.

### Child protection / organization

- [ ] Iwona Pilarz formally approves the proposed Standardy v1.1 and records the adoption date.
- [ ] Replace the public operative content with adopted v1.1 only after approval.
- [ ] Print/display both adopted full and shortened versions visibly in the Pozytywka premises.
- [ ] Confirm real personnel verification evidence is retained in the proper personnel records, not in the registration system.

### E-mail

- [x] Production custom sender operational: `zapisy@3stupidmen.com`.
- [x] Production participant delivery independently observed in the recipient mailbox.
- [x] Production notification transport reported success for the verified smoke request.
- [ ] Independently confirm delivery to the final administrative recipient mailbox.

### Vercel / abuse controls

- [ ] Create or inspect the production WAF rule for `POST /api/registrations` and record its exact limit/action.
- [ ] Verify the rule applies to the production project and does not block normal form submission.

The available Vercel connector exposes Firewall/WAF documentation but no action for listing or modifying project firewall rules, so this cannot be truthfully marked complete from the current tool surface.

### Manual acceptance

- [ ] Physical Android/Samsung Chrome.
- [ ] Physical iPhone Safari.
- [ ] Full keyboard-only human flow.
- [ ] Focus-visible human review.
- [ ] 200% zoom/reflow human review.
- [ ] Screen-reader spot check where possible.
- [ ] Final human visual/contrast review.
- [ ] Privacy and child-protection pages read-through.
- [ ] Real operator workflow in the Production Sheet with Iwona.

Desktop Chromium and mobile-sized Chromium are covered by automated E2E, but CI is not a substitute for physical Safari/Android or human accessibility review.

## Re-opening rule

`REGISTRATIONS_OPEN=TRUE` is allowed only after every remaining blocker above that can affect security, child protection, production identity or real-world operation is completed with evidence or explicitly superseded by a documented, approved decision. It is the final release action, not a testing shortcut.
