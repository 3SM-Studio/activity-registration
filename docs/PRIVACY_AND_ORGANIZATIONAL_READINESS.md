# Privacy and organizational readiness

Date: 2026-08-20
Status: production baseline adopted
Owner: Iwona Pilarz

The original v3 plan deliberately left legal and organizational decisions unresolved. Those decisions are now closed for the production baseline. The canonical detailed policy is `docs/RODO_AND_RETENTION_POLICY.md`, and the child-protection standards are `docs/STANDARDY_OCHRONY_MALOLETNICH.md` plus the shortened version for minors.

## 1. Controller

- Pracownia Twórcza Pozytywka. Iwona Pilarz
- NIP: 6371975064
- REGON: 122726372
- contact address: ul. Browarna 6a, 32-329 Bolesław
- privacy/contact e-mail: pozytywka.boleslaw@gmail.com
- phone: 602 753 268

The public privacy page must be updated when these contact details materially change.

## 2. Purpose and legal bases

Core v3 purpose:

1. receive a registration request,
2. identify participant and responsible adult where required,
3. use DOB for guardian flow and age-group matching,
4. contact the applicant,
5. propose and confirm an appropriate participation arrangement,
6. operate duplicate/security/accountability safeguards.

Adopted legal-basis model:

- Article 6(1)(b) GDPR for the requested registration/pre-contractual process,
- Article 6(1)(f) GDPR for narrowly scoped operational integrity, duplicate prevention, security and claims, subject to the documented balancing assessment,
- Article 6(1)(c) GDPR when a specific legal obligation applies.

No generic GDPR consent checkbox is used for the core process.

## 3. Data minimization

Public data remains limited to:

- city/offering,
- participant first/last name,
- DOB,
- guardian first/last name for a minor,
- phone,
- e-mail.

Do not add health data, PESEL, school, address, marketing consent, image consent or billing data to v3 without a separate approved purpose.

`NOTES` is operational only and must not become a store for diagnoses, medication, disability, family conflict, religion or other sensitive narrative.

## 4. Retention

Adopted schedule:

- active `NEW` / `IN_REVIEW` / `CONTACTED`: while handled; when closed without confirmation, no longer than 12 months from closure,
- `WAITLISTED`: through the relevant season plus 3 months,
- `REJECTED`: 12 months from rejection,
- `CANCELLED`: 12 months from cancellation,
- `CONFIRMED`: until the end of the calendar year in which 3 years have elapsed after the end of the relevant season,
- active dispute/legal hold: only the necessary data for the additional justified period.

Quarterly review owner: Iwona Pilarz.

Detailed procedure: `docs/RODO_AND_RETENTION_POLICY.md`.

## 5. Processors and transfers

Current data flow:

```text
Browser
-> Vercel / Next.js
-> Google Sheets
-> Resend
-> authorized Pozytywka operator(s)
```

Production policy:

- use provider data-processing terms/DPA,
- review provider subprocessors periodically,
- use applicable GDPR transfer safeguards for processing outside the EEA,
- do not add analytics, SMS, Messenger, payment or another processor without updating the inventory.

The current reviewed provider materials are listed in `docs/RODO_AND_RETENTION_POLICY.md`.

## 6. Production access policy

Persistent human access to participant PII is limited to Pozytywka operators who actually handle registrations.

Default production model:

- Iwona Pilarz: operator/owner access,
- PROD service identity: application access only,
- technical collaborators: no standing participant-data access; temporary minimum access only for a real incident when required,
- no public-link sharing,
- TEST identity must not have access to PROD,
- PROD identity must be separate from TEST.

Sharing is reviewed before opening production and after material team changes.

## 7. Data-subject requests

Operational contact: `pozytywka.boleslaw@gmail.com`.

Human-operated procedure:

1. record request date/type minimally,
2. verify identity proportionately,
3. locate relevant production records,
4. determine applicable right/exception,
5. perform the action,
6. respond through a verified channel,
7. record minimal evidence of completion.

No self-service account is required for v3.

## 8. Child protection

The applicable organization-level Standardy Ochrony Małoletnich are adopted in:

- `docs/STANDARDY_OCHRONY_MALOLETNICH.md`,
- `docs/STANDARDY_OCHRONY_MALOLETNICH_SKROT.md`.

Iwona Pilarz owns the procedure and review.

Before a person whose real duties involve work with minors is admitted to that activity, Pozytywka completes the checks required by Article 21 of the applicable Polish child-protection act. Verification/KRK documents are kept in personnel/person-specific records, not in `ZAPISY` or Git.

## 9. TEST data

TEST remains synthetic-only during routine QA. Real/manual delivery tests must be removed after the controlled test session.

TEST is closed outside active QA.

## 10. Production readiness truth

The former legal/business `TBD` blockers are closed by the production decisions adopted on 2026-08-20.

Remaining release gates are now technical execution/evidence only, such as:

- production Google identity and WIF boundary,
- Vercel Production environment values,
- Resend verified production sender/domain,
- WAF rule,
- final closed smoke and manual device/accessibility checks.

Those technical gates must not be marked complete until actual platform evidence exists.
