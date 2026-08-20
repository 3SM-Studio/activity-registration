# Privacy and organizational readiness

This document defines the operational privacy and child-protection readiness work for the Pozytywka registration application.

It is an engineering and operations contract. It is not legal advice and it deliberately does not invent legal bases, retention periods or unverified business data.

## 1. Current controller candidate

Public research consistently points to:

- business name: `Pracownia Twórcza Pozytywka. Iwona Pilarz`
- legal form: individual business / JDG
- NIP: `6371975064`
- REGON: `122726372`

Before production legal copy is approved, Iwona must confirm against the current official registry:

- exact current registered address,
- correspondence/contact address,
- privacy contact e-mail,
- whether any other entity jointly determines purposes or means of processing.

Third-party directory addresses must not be copied into production legal text without this verification.

## 2. Registration processing purpose

The product purpose currently supported by the application is narrowly defined as:

1. receive a request to join a Pozytywka activity,
2. identify the participant,
3. use date of birth to support age-group matching and guardian requirements,
4. identify a parent/guardian for a minor,
5. contact the applicant,
6. let Iwona review the request and choose an appropriate internal group/time,
7. confirm, waitlist, reject or cancel the request.

The public form does not currently:

- conclude the paid-services contract,
- process payment,
- manage attendance,
- collect health data,
- collect image/marketing consent,
- manage participant lifecycle after the intake workflow is closed.

Any future purpose expansion requires a separate data-minimization and legal review.

## 3. Current personal-data categories

Public form:

- city and requested activity,
- participant first name,
- participant last name,
- participant date of birth,
- guardian first name for a minor,
- guardian last name for a minor,
- phone number,
- e-mail address.

System/operational metadata:

- registration ID,
- request ID,
- timestamps,
- season and offering snapshots,
- workflow status,
- assigned internal group ID when known,
- possible-duplicate reference,
- privacy-notice version,
- source,
- operator notes.

Do not add PESEL, home address, school, diagnoses, medication, health history, image consent, marketing consent or invoice data without an approved purpose and design review.

## 4. Data flow and processor/recipient inventory

Current technical flow:

```text
Browser
  -> Vercel / Next.js application
  -> Google Sheets
  -> Resend
  -> authorized Pozytywka operator(s)
```

Inventory to verify before production:

| Party                    | Current role in system                     | Production readiness action                                                                   |
| ------------------------ | ------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Iwona Pilarz / Pozytywka | controller candidate and primary operator  | confirm legal identity and access responsibilities                                            |
| Vercel                   | application hosting and request processing | record applicable processing terms, region/transfer information and subprocessors as required |
| Google / Google Sheets   | persistent registration storage            | record applicable processing terms, access model and transfer information as required         |
| Resend                   | transactional participant/admin e-mail     | record applicable processing terms, sender configuration and subprocessors as required        |
| Authorized humans        | direct access to registration records      | maintain an approved named access list and least-privilege rule                               |

If analytics, Turnstile, SMS, Messenger, payment or another service is added, this inventory must be updated before production use of that service.

## 5. Access control procedure

Production registration data must be accessible only to people who need it to perform the intake process.

Minimum operational rules:

1. Keep a named list of people with access to the production Sheet.
2. Remove access when a person no longer needs it.
3. Do not use public-link sharing for the registration Sheet.
4. TEST service identity must not have access to PROD Sheet.
5. PROD service identity must be separate from TEST identity.
6. Technical collaborators should not receive participant-data access merely because they can access source code.
7. Review Google Sheet sharing before every production launch and periodically afterwards.

Owner of the final named access list: **TBD with Iwona**.

## 6. `NOTES` policy

`NOTES` is an operational field for information necessary to process the registration.

Allowed examples:

- attempted contact and a neutral operational outcome,
- preferred callback time if volunteered and useful,
- reason an ordinary intake decision needs follow-up,
- clarification necessary to match the participant to a group.

Do not use `NOTES` as a general profile of the child or family.

Without a separately approved process, do not write:

- diagnoses,
- disability details,
- medication,
- allergies or other health information,
- intimate/family-conflict details,
- religious beliefs,
- other special-category or highly sensitive data.

If Pozytywka later genuinely needs health/safety information, design a separate purpose-specific process instead of silently expanding `NOTES`.

## 7. Retention decision contract

The application must not invent a retention period.

Before production approval, Iwona/legal review must define retention criteria for at least:

- `NEW`, `IN_REVIEW`, `CONTACTED`,
- `WAITLISTED`,
- `CONFIRMED`,
- `REJECTED`,
- `CANCELLED`.

The decision must answer:

1. what business/legal purpose still exists after each outcome,
2. when that purpose ends,
3. whether deletion or anonymization is appropriate,
4. whether confirmed participants move to a separate record/process with a different retention basis,
5. who performs the periodic review,
6. how completion is evidenced without retaining unnecessary PII.

Until this decision is approved, production release remains blocked. No random value such as 90/180/365 days may be hardcoded merely to close the checklist.

## 8. Data-subject request procedure

Pozytywka must have a human-operated procedure. A self-service user account is not required for v3.

When a privacy request is received:

1. record the request date without copying unnecessary PII into development tools,
2. verify requester identity proportionately before disclosing or changing participant data,
3. locate relevant records using the production operational system,
4. determine the applicable right and any legal exceptions with the controller/legal reviewer,
5. perform the approved action,
6. send the response through an approved contact channel,
7. record minimal evidence that the request was handled.

Never paste participant records into GitHub issues, source-control comments or general engineering logs while handling a request.

Operational contact address and owner: **TBD with Iwona**.

## 9. Privacy notice production gate

The final notice must not be generated from assumptions.

Before `PRIVACY_NOTICE_URL` and `PRIVACY_NOTICE_VERSION` are configured in PROD, approve at least:

- controller identity and contact,
- purpose(s),
- legal basis/bases,
- recipients/categories of recipients,
- processor/subprocessor information where required,
- international-transfer information where applicable,
- retention period or criteria,
- data-subject rights,
- complaint right,
- whether providing each data category is required and the consequence of not providing it.

The form must not add a generic `Wyrażam zgodę na RODO` checkbox as a substitute for this work.

## 10. Child-protection readiness gate

The registration application does not store personnel criminal-record checks or child-protection case files.

Before public production launch, the business release checklist must record confirmation from Iwona that the organization-level requirements applicable to its artistic/interest-development work with minors are handled, including:

- applicable Standardy Ochrony Małoletnich exist,
- location/publication of the full standard is known,
- shortened/child-friendly version status is recorded where applicable,
- instructor/personnel verification procedure is in place,
- required checks for people actually working with minors are completed operationally,
- responsibility for reacting to child-protection concerns is defined.

Evidence should be recorded as a release-gate reference, not copied into `ZAPISY`.

## 11. TEST data rule

TEST is not a convenient place for real participant data.

Routine QA must use clearly synthetic identities and non-real contact data. Real participant data must not be copied from PROD into TEST.

If a controlled test needs e-mail delivery, use an explicitly approved test mailbox rather than a participant mailbox.

## 12. Logging and engineering tools

PII must not appear in:

- application request-body logs,
- Vercel diagnostic logs beyond unavoidable infrastructure metadata,
- GitHub issues/PR comments,
- test snapshots,
- fixtures committed to Git,
- screenshots attached to public engineering discussions.

Prefer technical identifiers, counts and error codes.

## 13. Release blockers that require external approval

The following cannot be truthfully closed by Codex alone:

- [ ] current official business address confirmed,
- [ ] privacy contact e-mail confirmed,
- [ ] final privacy notice approved,
- [ ] legal basis/bases approved,
- [ ] retention criteria approved,
- [ ] named production access list approved,
- [ ] Standardy Ochrony Małoletnich confirmation recorded,
- [ ] staff/instructor verification confirmation recorded,
- [ ] exact paid-contract conclusion process understood.

Engineering may prepare the system around these gates, but must remain fail-closed until they are closed.
