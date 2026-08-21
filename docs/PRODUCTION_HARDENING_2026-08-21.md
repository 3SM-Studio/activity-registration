# Production hardening - 2026-08-21

Status: **PRODUCTION CLOSED / FINAL HUMAN AND PHYSICAL GATES REMAIN**

This document records the evidence gathered during the v3 production-hardening pass. The current release truth is also maintained in `docs/RELEASE_CHECKLIST.md`.

## Immediate containment

- Canonical PROD Sheet: `1DRcWvY8xfZDGjJLWOr8Ax1XsyBw4dWU8C6u9WGNvFfM`.
- `REGISTRATIONS_OPEN` was changed from `TRUE` to `FALSE` during hardening.
- Production `ZAPISY` was returned to a header-only state after the synthetic smoke registration was verified and removed.
- Production remains closed until the final real-device, operator and physical-publication gates are complete.

## Production runtime evidence

- A real Production `POST /api/registrations` previously returned HTTP `201`.
- The corresponding `registrationId` was found in the canonical PROD Sheet, proving the deployed runtime wrote to the intended Production spreadsheet.
- The application success log contained technical identifiers/state flags only and no inspected participant PII.
- The verified smoke row was removed after testing.
- Production notification transport reported `registration.notifications.succeeded` for the verified smoke request.
- A real participant message was delivered from `Pracownia Twórcza Pozytywka <zapisy@3stupidmen.com>`.

## Google / identity evidence

Production service account:

`activity-registration-prod@pozytywka-reg-3sm-260819.iam.gserviceaccount.com`

TEST/Preview service account:

`activity-registration@pozytywka-reg-3sm-260819.iam.gserviceaccount.com`

Verified on 2026-08-21:

- the old TEST/general service account was removed from the PROD Sheet ACL,
- PROD Sheet general access is restricted,
- PROD service-account WIF binding is limited to `environment:production`,
- TEST service-account WIF binding is limited to `environment:preview`,
- TEST binding does not contain `environment:production`,
- OIDC issuer is `https://oidc.vercel.com/atypicalmichas`,
- allowed audience is `//iam.googleapis.com/projects/656375661462/locations/global/workloadIdentityPools/vercel/providers/vercel`,
- Vercel Production uses the canonical PROD Sheet and dedicated PROD service account,
- `ALLOW_TEST_SEED=false`,
- `ALLOW_PRODUCTION_CATALOG_SEED=false`.

Still desirable as an additional administrative check:

- independently review broader Google IAM/Drive access for the dedicated PROD service account,
- execute `pnpm prod:env:validate` against an authenticated export of the exact final Production environment if a safe execution surface is available.

## Abuse-control evidence

A Vercel Firewall custom rule was physically created and verified for:

- request path: `/api/registrations`,
- method: `POST`,
- rate-limit strategy: fixed window,
- window: `60 seconds`,
- limit: `10 requests`,
- key: IP address,
- action: `429 Too Many Requests`.

Physical test result on 2026-08-21:

- requests 1-10 reached the application and returned `400` for the intentionally invalid body,
- requests 11-12 were stopped by the WAF and returned `429`.

This verifies that the rule is active in Production rather than merely configured in a draft UI state.

## E-mail configuration

- Custom sender remains `Pracownia Twórcza Pozytywka <zapisy@3stupidmen.com>`.
- Canonical production admin recipient in code is now `michal.szwindowski@gmail.com`.
- Vercel Production `REGISTRATION_ADMIN_EMAILS` was migrated to `michal.szwindowski@gmail.com`.
- PR #42 passed full CI and was merged.
- Production was redeployed from merge commit `80d4fba8059215e2382c0391f6e8230c412a9726` with the final admin-recipient environment and reached `READY`.
- The redeployed site remained fail-closed with `registrationsOpen=false`.
- No warning/error/fatal runtime entries were observed in the immediate post-redeploy check.

One final real admin-notification delivery to `michal.szwindowski@gmail.com` remains useful before opening registrations.

## Hardening implemented in code

- Production runtime requires the canonical PROD Sheet and dedicated PROD service-account identity.
- Production environment validation rejects the Resend testing domain and unexpected admin-recipient baseline.
- Normal runtime rejects `ALLOW_PRODUCTION_CATALOG_SEED=true`.
- Google authentication failures are converted to a fixed safe application error before platform logging.
- Public form semantics and required-state accessibility were hardened.
- Related activity controls are grouped semantically.
- Contact copy remains neutral until participant age is known.
- Adult/minor repeat-registration copy is correct for each flow.
- Reduced-motion handling is targeted rather than globally forcing all animations to `0.01ms`.
- Public privacy and child-protection navigation is available from open and closed states.
- CSP/header baseline blocks objects and frames and restricts base/form/manifest targets.

## Child-protection legal review and adoption

The 2026 audit identified that the earlier v1.0 needed explicit coverage for children with disabilities and special educational needs, clearer publication requirements and documented periodic review rules.

Iwona Pilarz formally approved Standardy v1.1 on 2026-08-21 with the same effective date.

The operative repository documents are now:

- `docs/STANDARDY_OCHRONY_MALOLETNICH.md` - full v1.1,
- `docs/STANDARDY_OCHRONY_MALOLETNICH_SKROT.md` - shortened child-friendly v1.1.

The former v1.1 draft files were removed after adoption. Previous versions remain available through Git history.

The public routes are updated to present v1.1:

- `/standardy-ochrony-maloletnich`,
- `/standardy-ochrony-maloletnich/dla-dzieci`.

The remaining real-world legal/organizational publication gate is physical display of both adopted versions in the Pozytywka premises.

## Remaining blockers before opening registrations

### Physical / organizational

- [ ] Print and visibly display the adopted full Standardy v1.1 in the Pozytywka premises.
- [ ] Print and visibly display the adopted shortened v1.1 in the Pozytywka premises.
- [ ] Confirm personnel-verification evidence is retained in the appropriate personnel records, not the registration system.

### Final e-mail proof

- [ ] Confirm one real admin notification reaches `michal.szwindowski@gmail.com` from the final Production configuration.

### Manual acceptance

- [ ] Physical Android/Samsung Chrome.
- [ ] Physical iPhone Safari.
- [ ] Full keyboard-only human flow.
- [ ] Focus-visible human review.
- [ ] 200% zoom/reflow human review.
- [ ] Screen-reader spot check where practical.
- [ ] Final human visual/contrast review.
- [ ] Privacy + adopted v1.1 human read-through.
- [ ] Real operator workflow in the Production Sheet with the real catalog.

Desktop Chromium and mobile-sized Chromium are covered by automated E2E, but CI does not replace physical Safari/Android or human accessibility/operator review.

## Re-opening rule

`REGISTRATIONS_OPEN=TRUE` is the final release action. It is permitted only after the remaining physical/human gates that affect child protection and real-world operation are completed with evidence or explicitly superseded by a documented approved decision.
