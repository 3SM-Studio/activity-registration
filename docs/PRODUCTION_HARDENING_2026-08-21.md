# Production hardening - 2026-08-21

Status: **PRODUCTION CLOSED / RELEASE BLOCKED**

This document records evidence gathered after the v3 release-readiness audit. It does not replace `docs/RELEASE_CHECKLIST.md`; it explains why unchecked external gates must remain blocking.

## Immediate containment

- Canonical PROD Sheet: `1DRcWvY8xfZDGjJLWOr8Ax1XsyBw4dWU8C6u9WGNvFfM`.
- `REGISTRATIONS_OPEN` was explicitly changed from `TRUE` to `FALSE` on 2026-08-21 during hardening.
- Production must stay closed until every blocker below has evidence.

## Confirmed production evidence

### Runtime

The current production environment previously completed a real `POST /api/registrations` with HTTP `201` and subsequently logged `registration.notifications.succeeded`.

The application-level success log contained technical identifiers and state flags only. No participant name, guardian name, phone, e-mail, address or request body was present in the inspected success path.

### Google Sheet

The canonical PROD Sheet exists and includes the dedicated service account:

`activity-registration-prod@pozytywka-reg-3sm-260819.iam.gserviceaccount.com`

with writer access.

However, the older account:

`activity-registration@pozytywka-reg-3sm-260819.iam.gserviceaccount.com`

also still has writer access. This violates the intended TEST/PROD separation. An attempted permission downgrade through the available Drive connector did not change the existing writer role. The old writer permission must be removed using a Drive/IAM administration surface that supports permission deletion or update.

## Hardening implemented in code

- Production runtime now requires the canonical PROD Sheet and the dedicated PROD service account.
- Production environment validation additionally rejects the Resend testing domain and an unexpected admin-recipient baseline.
- Normal runtime must not have `ALLOW_PRODUCTION_CATALOG_SEED=true`.
- Google authentication failures are converted to a fixed safe application error before they can escape to Next/Vercel error handling; the original provider error is intentionally not retained as `cause`.
- A regression test verifies that fake `subject_token` and provider details do not survive sanitization.
- Public form semantics were hardened: related activity controls are grouped, custom required controls expose `aria-required`, required-field instructions precede the first field, and contact copy stays neutral until age is known.
- Reduced-motion behavior is targeted instead of globally forcing every transition and animation to `0.01ms`.
- The existing modal shadcn/Radix date picker architecture is retained.
- Public privacy, child-protection and contact navigation is available from the form and closed states.
- Full and child-friendly currently adopted Standardy v1.0 have public routes prepared.
- Response-header baseline additionally blocks objects and frames without introducing a nonce-based CSP that could silently change Next.js rendering architecture.

## Child-protection legal review

Research against the consolidated 2026 text of the Act identified a gap in adopted Standardy v1.0: art. 22c(4) requires the standards to take into account children with disabilities and children with special educational needs.

A proposed v1.1 is prepared in:

- `docs/STANDARDY_OCHRONY_MALOLETNICH.md`
- `docs/STANDARDY_OCHRONY_MALOLETNICH_SKROT.md`

The proposal adds:

- an explicit reporting channel,
- accessible communication and intervention rules for children with disabilities and special educational needs,
- explicit written documentation of the required periodic review,
- explicit publication of full and shortened versions on the website and visibly in the premises.

**The proposed v1.1 is not formally adopted by code or by this document.** Iwona Pilarz must approve it as the responsible process owner before it is presented as the operative version.

## Remaining release blockers

### Google / identity

- [ ] Remove the old `activity-registration@...` writer permission from the PROD Sheet.
- [ ] Verify the Production WIF subject can impersonate only the dedicated PROD service account for this workload.
- [ ] Verify the TEST/Preview identity cannot write to the PROD Sheet.
- [ ] Execute repository `sheet:validate`, `diagnostics` and reconciliation using the final PROD identity while registrations remain closed.

### Child protection / organization

- [ ] Iwona Pilarz formally approves the proposed Standardy v1.1 and records the adoption date.
- [ ] Publish v1.1 full and shortened versions as the operative website content.
- [ ] Print/display both full and shortened versions visibly in the Pozytywka premises.
- [ ] Confirm real personnel verification evidence is retained in the proper personnel records, not in the registration system.

### E-mail

- [ ] Confirm in Resend that the production sender domain/address is verified for sending.
- [ ] Confirm the deployed `EMAIL_FROM` uses that verified domain.
- [ ] Confirm participant and admin delivery from the final closed-production configuration.

### Vercel / abuse controls

- [ ] Create or inspect the production WAF rule for `POST /api/registrations` and record its exact limit/action.
- [ ] Verify the rule applies to the production project and does not block normal form submission.

### Manual acceptance

- [ ] Desktop Chrome.
- [ ] Physical Android/Samsung Chrome.
- [ ] iPhone Safari.
- [ ] Full keyboard-only flow.
- [ ] Focus-visible review.
- [ ] 200% zoom/reflow.
- [ ] Screen-reader spot check where possible.
- [ ] Final visual/contrast review.
- [ ] Privacy and child-protection pages read-through.
- [ ] Real operator workflow in the Production Sheet with Iwona.

## Re-opening rule

`REGISTRATIONS_OPEN=TRUE` is allowed only after every remaining blocker above is either completed with evidence or explicitly superseded by a documented, approved decision. It is the final release action, not a testing shortcut.
