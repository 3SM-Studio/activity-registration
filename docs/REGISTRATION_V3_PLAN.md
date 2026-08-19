# Pozytywka Registration v3

Status: target product and implementation contract before runtime v3 changes.

This document is the canonical repository summary of the approved v3 plan. It supersedes conflicting v1/v2 product assumptions. Current runtime remains schema v2 until explicit migrations are implemented and verified.

## 1. Product definition

The application is a public registration-request system for Pracownia Twórcza Pozytywka.

The user:

1. chooses a city,
2. chooses a public activity/offering,
3. enters participant data,
4. enters guardian data if the participant is under 18,
5. enters contact data,
6. sends a request.

The request is not an automatic place confirmation.

After submission Iwona Pilarz currently handles the request operationally. Pozytywka reviews the request, uses date of birth to help choose an age-appropriate internal group, contacts the parent/guardian/adult participant, proposes the actual group and time, and then confirms, waitlists, rejects or otherwise closes the request.

The public user does not choose the final internal weekly group in v3.

## 2. Explicit non-goals

v3 core does not:

- conclude a paid service contract,
- charge money,
- atomically reserve capacity,
- guarantee a place,
- manage attendance,
- manage recurring payments,
- manage participation through the whole school year,
- manage resignation from already-running classes,
- manage theatrical casting,
- collect image/marketing consent,
- collect health data,
- replace child-protection procedures,
- replace accounting,
- become a generic CRM.

## 3. Confirmed business facts

- New requests are handled by Iwona Pilarz at the current scale.
- Every new request requires verification and contact before a place is confirmed.
- The public form asks for an activity type, not the final group/time.
- Pozytywka wants a waiting-list workflow.
- Most regular activities broadly follow a September-to-July season and can usually accept people during the season if a suitable place exists.
- At least one theatre/production-like activity has a limited registration window and can become closed after casting/role assignment.
- The system must continue supporting adults even if most current participants are minors.
- Full date of birth remains justified because it helps group matching near age boundaries and determines the guardian flow.

Unknown business rules must not be invented, especially prices, payment method, contract-conclusion point, resignation rules, exact theatre rules, real groups, capacities and contact SLA.

## 4. Target concepts

### City

Public location scope. Current concept remains.

### Season

New first-class concept.

Target fields:

```text
SEASON_ID
NAME
START_DATE
END_DATE
ACTIVE
SORT_ORDER
```

The current registration season is selected explicitly through `CURRENT_SEASON_ID`. Do not infer it only from the calendar month.

### Offering

A public type of activity requested by the user. It is not the final internal group.

Target fields:

```text
OFFERING_ID
CITY_ID
NAME
PUBLIC_DESCRIPTION
ACTIVE
SORT_ORDER
REGISTRATION_MODE
INTAKE_STATE
REGISTRATION_OPEN_FROM
REGISTRATION_OPEN_TO
WAITLIST_ENABLED
```

`REGISTRATION_MODE`:

```text
ROLLING
WINDOWED
```

`INTAKE_STATE`:

```text
OPEN
WAITLIST_ONLY
CLOSED
```

`WINDOWED` requires explicit opening and closing dates. Do not hardcode theatre-specific conditions by offering name.

### Internal Group

An internal group is selected by Pozytywka after review. It is not a required public form field.

Target fields:

```text
GROUP_ID
SEASON_ID
OFFERING_ID
NAME
AGE_MIN
AGE_MAX
DAY_OF_WEEK
START_TIME
END_TIME
LOCATION
INSTRUCTOR
CAPACITY
ACTIVE
SORT_ORDER
```

Do not auto-assign groups in v3. Exact matching remains Iwona's decision.

### Registration

A registration is a request, not a confirmed place.

Target statuses:

```text
NEW
IN_REVIEW
CONTACTED
WAITLISTED
CONFIRMED
REJECTED
CANCELLED
```

For this intake application `CONFIRMED`, `REJECTED` and `CANCELLED` are closed outcomes. Later attendance/resignation is outside v3 scope.

## 5. Target Google Sheets structure

System sheets:

```text
MIASTA
SEZONY
OFERTY_ZAJEC
GRUPY
ZAPISY
USTAWIENIA
```

`ZAPISY` must remain one canonical native Google Sheets Table. Do not create one sheet per status.

New v3 registration fields:

```text
SEASON_ID
SEASON_NAME_SNAPSHOT
ASSIGNED_GROUP_ID
CONTACTED_AT
CONFIRMED_AT
POSSIBLE_DUPLICATE_OF
```

Do not fabricate unknown values for historical v1/v2 rows.

Operator-facing business fields should be visible first. Technical IDs and schema metadata stay in the same canonical record but should be moved right or hidden for normal operator work.

Operator-editable fields should include at least:

```text
STATUS
ASSIGNED_GROUP_ID
CONTACTED_AT
CONFIRMED_AT
NOTES
```

`NOTES` must not become an uncontrolled store for diagnoses, health information or other sensitive data.

## 6. Business duplicate detection

Keep technical `requestId` idempotency. Add a separate business-deduplication layer.

Business identity is based on normalized:

```text
participant first name
participant last name
BIRTH_DATE
CITY_ID
OFFERING_ID
SEASON_ID
```

Contact signals use normalized phone (E.164) and normalized email.

### Exact active duplicate

If participant/business identity, phone and email match an existing active request in:

```text
NEW
IN_REVIEW
CONTACTED
WAITLISTED
CONFIRMED
```

then do not append a new row. Return a safe success result telling the user that the same request is already in the system.

Do not expose the previous status, internal notes, assigned group or stored contact details.

### Probable duplicate

If participant/business identity matches but phone or email differs:

- do not block,
- create the new registration,
- set `POSSIBLE_DUPLICATE_OF` to the most relevant earlier registration,
- warn Iwona internally.

Reasons include a second parent, changed contact details or a previous typo.

### Valid new registrations

The same participant on another offering or another season is valid and must not be blocked.

A previous `REJECTED` or `CANCELLED` request may be submitted again.

Legacy rows without reliable `BIRTH_DATE` must never hard-block a new request using guessed identity.

Google Sheets cannot guarantee atomic business uniqueness for two simultaneous different request IDs. v3 dedupe is strong soft deduplication. If hard uniqueness becomes a real requirement, review storage and likely migrate registrations to PostgreSQL/Supabase.

## 7. Canonical submit order

`submitRegistration()` should conceptually execute:

1. Zod parse.
2. Normalize names, phone and email.
3. Calculate age at submission.
4. Validate anti-bot fields/minimum fill time.
5. Resolve same `requestId` replay first.
6. Read catalog, settings and current season.
7. Verify global registrations state and privacy readiness when required.
8. Verify current season.
9. Verify city.
10. Verify offering/city relation.
11. Compute offering intake status for current date.
12. Reject unavailable/closed offering.
13. Run business duplicate detection.
14. Exact duplicate: return safe duplicate success without append.
15. Probable duplicate: append with `POSSIBLE_DUPLICATE_OF`.
16. Normal request: append `NEW` registration.
17. Trigger notifications only after successful persistence.

Technical replay and business duplicate handling must remain separate concepts.

## 8. Public UX

Keep the form one page. Do not build a wizard for the current amount of data.

Remove/redesign the current visual stepper if it implies multiple screens.

Use clear sections:

```text
Zajęcia
Uczestnik
Rodzic lub opiekun
Kontakt
```

Early copy must explain the real workflow:

```text
Wybierz miasto i zajęcia, a następnie podaj dane uczestnika.
Po wysłaniu Pozytywka sprawdzi zgłoszenie i skontaktuje się z Tobą, aby dobrać odpowiednią grupę i termin.
```

DOB description should state the real purpose:

```text
Data urodzenia pomaga nam dobrać odpowiednią grupę wiekową oraz ustalić, czy potrzebujemy danych rodzica lub opiekuna.
```

Near submit explain:

```text
Wysłanie formularza jest zgłoszeniem na zajęcia.
Pozytywka musi je najpierw zweryfikować i potwierdzić odpowiednią grupę.
```

Do not add a generic `Wyrażam zgodę na RODO` checkbox.

Normal success must explain what happens next and that the place is not yet confirmed.

Exact duplicate success should state only that the same request is already present and no new submission is needed.

After normal success support:

```text
Zapisz kolejne dziecko
Wyślij zgłoszenie na inne zajęcia
```

Generate a fresh request ID for every new logical submission.

## 9. Emails

Participant email must no longer say Pozytywka contacts the user only if additional information is needed.

It must explain that Pozytywka will review the request and contact the user to choose/confirm a suitable group and time.

Admin email should prioritize Iwona's work and include participant, DOB, age, city, offering, guardian if required, phone, email, submitted timestamp and probable-duplicate warning when present.

## 10. Input quality

Preserve current controls:

- person names: no leading whitespace, collapse repeated whitespace, allow internal spaces/apostrophes/hyphens/Unicode,
- server-side trim/collapse/Unicode normalization,
- email whitespace rejection/normalization,
- international phone selector + country-aware formatting + E.164 storage,
- shadcn/Radix DOB picker,
- no future DOB,
- Polish locale,
- server validation.

## 11. Privacy and legal release gates

Current public data should remain minimal:

```text
city
activity
participant first name
participant last name
birth date
guardian first name
guardian last name
phone
email
```

Do not add PESEL, home address, school, diagnoses, disability, allergies, medication, health history, image consent, marketing consent or invoice details without a separately approved need.

Production requires an approved privacy notice covering controller identity/contact, purposes, legal bases, recipients/processors, retention, rights and other required information.

Business identity research is only candidate data until confirmed directly with Iwona/current official registry:

```text
Pracownia Twórcza Pozytywka. Iwona Pilarz
NIP 6371975064
REGON 122726372
```

Do not hardcode a registered/contact address before confirmation.

Document the real processor/access flow, including Vercel, Google/Sheets, Resend and authorized human operators.

Retention must be decided intentionally. Do not invent a random number of days.

Before production record evidence that Pozytywka has the required child-protection standards and required staff/instructor verification processes. Do not store criminal-record or child-protection personnel records in `ZAPISY`.

## 12. TEST hygiene

Normal TEST QA must use synthetic data only.

Before v3 schema work:

1. close TEST registrations,
2. create a backup,
3. clean real/manual PII test rows,
4. keep clearly synthetic fixtures,
5. verify canonical preview commit equals GitHub `preview` before QA.

Do not write to PROD during v3 development.

## 13. Migration target

Target versions:

```text
SYSTEM_SCHEMA_VERSION=3
REGISTRATION_SCHEMA_VERSION=3
```

Migration v2 -> v3 must be explicit, idempotent and TEST-first. It must:

- create `SEZONY` if missing,
- create `GRUPY` if missing,
- extend `OFERTY_ZAJEC`,
- extend `ZAPISY`,
- update native table metadata and status dropdown,
- update protection/editable sets,
- add `CURRENT_SEASON_ID`,
- only set schema v3 after previous steps succeed,
- preserve all existing data,
- never guess historical fields.

Rollback is restore from pre-migration backup unless a real reverse migration is implemented and tested.

## 14. Testing expectations

Every PR keeps:

```text
pnpm check
pnpm test:e2e
```

green.

Google-backed PRs additionally require TEST-only:

```text
sheet:validate
diagnostics
test:integration:sheets
```

v3 tests must cover intake modes, seasons, exact/probable duplicates, same participant on another offering/season, legacy rows, adult/minor boundaries, mobile viewports, duplicate success, repeat registration and real Google native-table behavior.

## 15. Implementation order

Use separate PRs:

1. `docs/v3-product-truth`
2. `chore/test-hygiene-and-preview`
3. `feat/sheets-schema-v3-foundation`
4. `feat/offering-intake-rules`
5. `feat/registration-business-deduplication`
6. `feat/registration-workflow-statuses`
7. `feat/operator-sheets-experience`
8. `feat/registration-copy-and-repeat-flow`
9. `feat/group-catalog-operations` after real Iwona group data exists
10. `chore/privacy-retention-readiness`
11. `feat/abuse-hardening`
12. `chore/prod-readiness`

Do not combine all v3 work into one giant PR.

## 16. Storage migration triggers

Review Google Sheets as the primary registration store when the business needs any of:

- hard atomic capacity reservation,
- online payments,
- user accounts,
- many concurrent operators,
- strict audit/event history,
- scale that makes bounded dedupe scans impractical,
- hard uniqueness guarantees,
- attendance/member lifecycle in the same app.

Do not migrate pre-emptively.

## 17. Open decisions Codex must not guess

Need verified input from Iwona for:

- real city/offering list,
- real internal groups,
- age ranges,
- schedules,
- instructors,
- capacities,
- prices,
- payment rules,
- contract-conclusion process,
- resignation rules,
- theatre casting/window details,
- response/contact SLA,
- whether guardian relationship is operationally useful,
- confirmed privacy contact/address,
- retention periods.

When a task depends on one of these values, stop and report the missing decision instead of inventing it.

## 18. Priority rule

Optimize for:

```text
correct business meaning
> data integrity
> privacy/security
> mobile user clarity
> operator simplicity
> architectural purity
> feature count
```

If a field cannot be justified by a real business purpose, do not collect it.
