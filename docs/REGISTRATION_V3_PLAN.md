# POZYTYWKA REGISTRATION V3
## Product, domain, data, legal, UX and implementation plan for Codex

**Status:** target plan before implementation  
**Project:** `3SM-Studio/activity-registration`  
**Primary integration branch:** `preview`  
**Primary TEST environment:** canonical Vercel preview + TEST Google Sheet  
**Primary operator:** Iwona Pilarz  
**Document purpose:** define what the application is, why it works this way, what must change, what must not be guessed, and how to implement v3 safely.

---

# 0. How Codex must use this document

This document is the implementation contract for the next major iteration of the Pozytywka registration system.

Codex must:

1. Read this document before making product or schema changes.
2. Read the current repository truth docs:
   - `PRODUCT.md`
   - `docs/DECISIONS.md`
   - `docs/DATA_MODEL.md`
   - `docs/ARCHITECTURE.md`
   - `docs/SECURITY.md`
   - `docs/OPERATIONS.md`
   - `docs/IMPLEMENTATION_STATUS.md`
   - `docs/RELEASE_CHECKLIST.md`
3. Verify current code before assuming any statement in older documentation is still true.
4. Treat this v3 plan as newer than conflicting v1/v2 decisions.
5. Never invent missing business data.
6. Never put real participant PII into Git, fixtures, test snapshots, issue comments or logs.
7. Never write to PROD while implementing or testing v3.
8. Keep TEST and PROD identity separated.
9. Use a feature branch and PR for each logical stage.
10. Run the repository quality gates before merge:
    - `pnpm check`
    - `pnpm test:e2e`
11. For Google-backed changes also run, against TEST only:
    - `sheet:validate`
    - `diagnostics`
    - the dedicated real-Google integration test
12. Stop and report instead of guessing when an implementation depends on a missing Pozytywka business decision.

Do not convert this project into a generic SaaS CRM. The scope is intentionally narrow.

---

# 1. Canonical product definition

## 1.1 What this application is

The application is a **public registration request system for Pracownia Twórcza Pozytywka**.

A parent, guardian or adult participant:

1. chooses a city,
2. chooses a type of activity,
3. provides participant data,
4. provides guardian data if the participant is a minor,
5. provides contact data,
6. sends a registration request.

The request is **not an automatic confirmation of a place**.

After submission Pozytywka, operationally Iwona Pilarz at the current scale, must:

1. review the request,
2. determine whether there is a suitable internal group,
3. use date of birth to help match the participant to an age-appropriate group,
4. contact the parent, guardian or adult participant,
5. propose the actual group and time,
6. confirm the registration, place the person on a waiting list, reject the request or close it for another reason.

This distinction is fundamental.

## 1.2 What the user chooses

The public user chooses a **type of activity**, for example:

- Hip-hop
- contemporary
- theatre
- vocal or vocal-dance activity

The user does **not** select the final internal group or exact weekly time in the current product model.

Example:

```text
PUBLIC CHOICE
Gdynia -> Hip-hop

INTERNAL POZYTYWKA DECISION AFTER REVIEW
Hip-hop / 10-12 years / Wednesday 17:30 / specific venue
```

Do not expose internal group assignment as a required public selection unless the business process changes later.

## 1.3 What the application does not do

The application does not currently:

- conclude a paid service contract,
- charge money,
- reserve a place atomically,
- guarantee availability,
- manage attendance,
- manage recurring payments,
- manage participant membership through the whole school year,
- handle resignation from already-running regular classes,
- manage theatrical casting,
- manage image/marketing consent,
- store health data,
- replace Pozytywka's child-protection procedures,
- replace accounting,
- replace a full CRM.

These are explicit non-goals for v3 unless a separate approved project expands the scope.

---

# 2. Confirmed business facts

The following facts are considered confirmed from the current project conversation and should drive the model.

## 2.1 Operator

At the current scale new submissions are handled by **Iwona Pilarz**.

## 2.2 Verification is required

A new request is not immediately accepted.

Pozytywka must review it and contact the parent, guardian or adult participant.

The user must not be told that they can simply appear at the next class after submitting the form.

## 2.3 Internal group assignment happens later

The public form asks for an activity type.

Pozytywka later decides which actual internal group and time are appropriate.

## 2.4 Waiting list

Pozytywka wants a waiting-list workflow.

The system must therefore support a request that is valid but cannot currently be confirmed because there is no suitable place.

## 2.5 Regular activities

Most regular groups broadly operate on a school-year-like cycle, approximately September to July.

A participant can generally join during the season, subject to the availability of an appropriate group.

The exact payment and resignation rules are not yet confirmed and must not be invented in the application.

## 2.6 Theatre or production-like activities

At least one theatrical model behaves differently:

- registrations may only be open for a limited period,
- after casting / role assignment the group can become closed to new entrants,
- resignation may be more restricted operationally because it affects the production.

Exact theatre rules remain to be audited with Iwona.

The code must support the distinction without hardcoding a special case named `theatre`.

## 2.7 Adult users

Pozytywka probably focuses mostly on minors and youth, but the form must continue supporting participants aged 18+.

For adults:

- guardian fields do not appear,
- contact fields refer to the participant.

Do not remove adult support merely because current groups may mostly be under 18.

## 2.8 Full date of birth

Full date of birth is retained.

Business justification:

- precise age helps Iwona match a participant near an age boundary to a suitable internal group,
- it determines whether guardian details are required.

The UI explanation must state this real purpose.

---

# 3. External business research notes

These facts came from public web research and are useful context, but legal identity data must still be confirmed with Iwona or directly in the current official registry before production legal copy is published.

## 3.1 Business identity candidate data

Public sources derived from CEIDG consistently identify:

```text
Business name:
Pracownia Twórcza Pozytywka. Iwona Pilarz

Legal form:
individual business / jednoosobowa działalność gospodarcza

NIP:
6371975064

REGON:
122726372

Business start date shown by public sources:
2019-11-01
```

A registered address shown by public business sources is:

```text
ul. Legionów Polskich 14
32-300 Olkusz
```

Some public aggregators separately show a Bolesław contact/location address.

**Production rule:** do not hardcode the registered or contact address into privacy/legal pages until Iwona confirms the current CEIDG entry and the correct contact address.

## 3.2 Public activity context

Public institutional sources show Pozytywka in the area of:

- artistic education,
- vocal and vocal-dance groups,
- youth artistic work,
- theatre and musical theatre,
- productions involving larger youth ensembles,
- collaboration with multiple instructors.

This supports a domain model where:

- a public `Offering` is not the same thing as an internal `Group`,
- regular rolling activities and project/window-based activities must both be possible,
- child protection and staff verification are operationally important.

---

# 4. Current system strengths that must be preserved

Do not rewrite working foundations without a specific reason.

The current architecture already has strong properties:

- Next.js App Router frontend and API,
- strict TypeScript,
- Zod validation,
- React Hook Form,
- shadcn/Radix form primitives,
- international phone input,
- phone normalization to E.164,
- date-of-birth picker,
- server-side validation,
- Google Sheets repository adapter,
- Google Sheets native Table for registrations,
- header-by-name mapping,
- versioned sheet schema,
- request ID idempotency,
- reconciliation after ambiguous writes,
- no automatic retry of non-idempotent append,
- TEST and PROD spreadsheet separation,
- Vercel OIDC -> Google WIF,
- server-only Google credentials,
- PII-safe structured logging,
- email confirmation + admin notification,
- mobile E2E coverage,
- Samsung-oriented regression coverage,
- exact pinned dependencies,
- production fail-closed principles,
- native Sheets `STATUS` dropdown,
- warning-only protection of technical columns.

The v3 work should evolve these foundations.

---

# 5. Current problems and gaps

This section is the audit baseline.

## P0 / correctness and release-process gaps

### 5.1 Documentation drift

Older project docs still contain assumptions that are no longer true, including:

- age-only input instead of date of birth,
- schema v1 statements while TEST is schema v2,
- old append behavior,
- old test counts and old UI state.

This is dangerous because Codex may read old docs and undo correct v2 decisions.

**Action:** v3 begins with documentation truth synchronization.

### 5.2 TEST contains manual / real-looking PII

TEST has rows entered during manual validation that contain real-looking names, emails and phone numbers.

This violates the intended test-data policy.

**Action:**

1. create a backup,
2. close TEST registrations,
3. remove manual PII rows,
4. keep only clearly synthetic test data,
5. never use real contact details for routine QA.

### 5.3 TEST can currently accept submissions

Current TEST settings have `REGISTRATIONS_OPEN=TRUE`.

At the same time the privacy page remains a TEST placeholder.

TEST should be open only during controlled QA, not as an accidental public intake system.

### 5.4 Canonical preview deployment drift

The canonical Vercel preview has previously lagged behind the GitHub `preview` branch because of Vercel build rate limits.

Before each product QA cycle Codex must verify:

```text
GitHub preview HEAD == canonical preview deployment git SHA
```

Do not report a feature as deployed merely because it exists in GitHub.

### 5.5 Vercel feature-branch deployment noise

`vercel.json` is intended to deploy only `preview` and `main`, but feature-branch deployments were still observed during development.

The official Vercel configuration supports branch matching through `git.deploymentEnabled`, so the configuration and actual behavior must be diagnosed rather than worked around with repeated commits.

Do not use repeated no-op commits as the normal deployment strategy.

---

## P1 / product-model gaps

### 5.6 No season model

The system cannot distinguish:

```text
Hip-hop in season 2026/2027
```

from:

```text
Hip-hop in season 2027/2028
```

This affects:

- reporting,
- duplicate detection,
- historical meaning,
- future waiting lists,
- internal group assignment.

### 5.7 Offering model is too small

Current offering data effectively contains:

```text
id
city
name
active
sort order
```

It cannot represent:

- rolling vs time-windowed intake,
- temporarily closed intake,
- waiting-list-only intake,
- registration opening/closing dates,
- short public explanation.

### 5.8 No internal group model

Pozytywka assigns the real group after review, but there is currently nowhere to represent that assignment.

### 5.9 Status model is too weak

Current statuses:

```text
NEW
IN_PROGRESS
ACCEPTED
CANCELLED
```

do not describe the real operational workflow.

### 5.10 No business duplicate detection

`requestId` prevents transport retries from creating duplicates, but the same person can open the form again and generate a new request ID.

This is a different problem.

### 5.11 Success screen is too vague

The current confirmation tells the user that a request was submitted but does not explain the mandatory next step clearly enough.

### 5.12 Participant email copy is inaccurate

Current email copy says Pozytywka will contact the user *if additional information is needed*.

The actual business flow is that Pozytywka **must contact the user after review** to match and confirm a group.

### 5.13 Fake stepper risk

The page visually suggests steps such as:

```text
1 Zajęcia
2 Uczestnik
3 Kontakt
```

but the form is one continuous page.

For a short mobile-first form this should be presented as sections, not as a fake multi-step wizard.

### 5.14 Operator view is still too technical

Native Sheets Table is correct, but the registration sheet is still primarily shaped like a datastore.

Iwona needs an operator-first view.

---

## P1 / legal and operational gaps

### 5.15 Production privacy notice is not final

The production release remains blocked until the real privacy notice is approved.

Do not add a fake generic checkbox named "I agree to GDPR".

### 5.16 Retention policy is undefined

The system knows how to save personal data but does not yet have an approved rule for when it is no longer required.

### 5.17 Processor / access inventory is incomplete

The real flow includes at least:

```text
Browser
-> Vercel
-> application
-> Google Sheets
-> Resend
-> authorized human operators
```

This must be reflected in the privacy and operational inventory.

### 5.18 Child-protection compliance must be confirmed

Because Pozytywka organizes artistic activity / development of interests for minors, the organization falls within the category addressed by the Polish rules on Standardy Ochrony Małoletnich.

Iwona says these are probably already present, but before production the project checklist must record:

- that the standards exist,
- where the full version is stored/published,
- where the child-friendly version is available where applicable,
- that required personnel verification procedures are in place.

This is an organization-level requirement, not a reason to collect extra data in this public registration form.

### 5.19 Notes can become a privacy trap

The free-form `NOTES` column can accidentally become a store for:

- diagnoses,
- health information,
- family problems,
- other special-category data.

Operational guidance must explicitly say not to use it for sensitive data without an approved purpose and legal basis.

---

# 6. Target business flow

The canonical v3 flow is:

```text
USER OPENS FORM
    |
    v
choose city
    |
    v
choose activity / public offering
    |
    v
enter participant data
    |
    +--> if minor -> guardian data
    |
    v
enter phone + email
    |
    v
submit
    |
    v
server validation + normalization
    |
    v
technical requestId replay check
    |
    v
validate current season + offering availability
    |
    v
business duplicate check
    |
    +--> exact active duplicate
    |      |
    |      +--> do not create new row
    |      +--> return safe "we already have this request" result
    |
    +--> probable duplicate
    |      |
    |      +--> create row
    |      +--> flag POSSIBLE_DUPLICATE_OF for Iwona
    |
    +--> no duplicate
           |
           +--> create NEW row
    |
    v
participant email confirmation
    |
    v
admin notification
    |
    v
Iwona reviews
    |
    v
IN_REVIEW
    |
    +--> contact
    |      |
    |      v
    |   CONTACTED
    |
    +--> no suitable place now
    |      |
    |      v
    |   WAITLISTED
    |
    +--> suitable group agreed
    |      |
    |      v
    |   CONFIRMED
    |
    +--> cannot accept
    |      |
    |      v
    |   REJECTED
    |
    +--> applicant withdraws before confirmation
           |
           v
       CANCELLED
```

---

# 7. Target domain model

## 7.1 City

Public location scope.

```ts
type City = {
  id: CityId;
  name: string;
  active: boolean;
  sortOrder: number;
};
```

No major conceptual change.

## 7.2 Season

New first-class concept.

Example:

```text
2026-2027
2026/2027
2026-09-01
2027-07-31
```

Target:

```ts
type Season = {
  id: SeasonId;
  name: string;
  startDate: IsoDate;
  endDate: IsoDate;
  active: boolean;
  sortOrder: number;
};
```

The current public registration season should come from a setting:

```text
CURRENT_SEASON_ID
```

Do not infer the active season solely from the current month.

Why:

- the business may open registration before September,
- theatre/project windows can differ,
- explicit configuration is safer than hidden calendar magic.

## 7.3 Offering

An `Offering` is the public type of activity the user requests.

It is **not** the internal weekly group.

Target fields:

```ts
type RegistrationMode = "ROLLING" | "WINDOWED";

type IntakeState = "OPEN" | "WAITLIST_ONLY" | "CLOSED";

type Offering = {
  id: OfferingId;
  cityId: CityId;
  name: string;
  publicDescription: string | null;
  active: boolean;
  sortOrder: number;

  registrationMode: RegistrationMode;
  intakeState: IntakeState;

  registrationOpenFrom: IsoDate | null;
  registrationOpenTo: IsoDate | null;

  waitlistEnabled: boolean;
};
```

### Semantics

`ACTIVE`

- whether the offering exists and may be shown publicly.

`REGISTRATION_MODE`

- `ROLLING`: normally accepts requests throughout the relevant period,
- `WINDOWED`: accepts requests only in a configured date window.

`INTAKE_STATE`

- manual business override,
- `OPEN`: normal requests,
- `WAITLIST_ONLY`: requests may still be accepted but the UI makes it clear that a place is not currently expected,
- `CLOSED`: no submission for the offering.

`REGISTRATION_OPEN_FROM` / `REGISTRATION_OPEN_TO`

- required for `WINDOWED`,
- normally empty for `ROLLING`.

`WAITLIST_ENABLED`

- whether `WAITLIST_ONLY` and later operator waitlisting are valid for this offering.

### Validation rules

For `WINDOWED`:

```text
registrationOpenFrom != null
registrationOpenTo != null
registrationOpenFrom <= registrationOpenTo
```

For `ROLLING`:

dates should normally be empty.

For `WAITLIST_ONLY`:

```text
waitlistEnabled == true
```

Invalid catalog configuration must fail diagnostics.

## 7.4 Internal Group

An internal group is selected by Pozytywka after review.

It is not a public mandatory form field.

Proposed model:

```ts
type Group = {
  id: GroupId;
  seasonId: SeasonId;
  offeringId: OfferingId;
  name: string;

  ageMin: number | null;
  ageMax: number | null;

  dayOfWeek: string | null;
  startTime: string | null;
  endTime: string | null;

  location: string | null;
  instructor: string | null;
  capacity: number | null;

  active: boolean;
  sortOrder: number;
};
```

Important:

- age ranges help the operator, but the system must **not automatically assign a group** in v3,
- exact matching remains Iwona's decision,
- capacity is informational in v3 unless a later transactional system is introduced.

## 7.5 Registration

A registration is a request, not a confirmed place.

Target status:

```ts
type RegistrationStatus =
  | "NEW"
  | "IN_REVIEW"
  | "CONTACTED"
  | "WAITLISTED"
  | "CONFIRMED"
  | "REJECTED"
  | "CANCELLED";
```

### Status definitions

`NEW`

- received,
- not yet actively reviewed.

`IN_REVIEW`

- Iwona has started processing it.

`CONTACTED`

- parent/guardian/adult participant has been contacted, final result is not yet settled.

`WAITLISTED`

- valid candidate but no suitable place now.

`CONFIRMED`

- Pozytywka has completed review/contact and confirmed a concrete participation arrangement.

`REJECTED`

- Pozytywka cannot accept the request.

`CANCELLED`

- the applicant withdrew or the request was closed before confirmation for a non-rejection reason.

### Terminal semantics for this application

For v3:

```text
CONFIRMED
REJECTED
CANCELLED
```

are considered closed for registration-intake workflow purposes.

The application does not track later class attendance or resignation from an already running class.

---

# 8. Google Sheets schema v3

Target system sheets:

```text
MIASTA
SEZONY
OFERTY_ZAJEC
GRUPY
ZAPISY
USTAWIENIA
```

Do not create additional sheets without a clear reason.

## 8.1 MIASTA

Keep:

```text
CITY_ID
NAME
ACTIVE
SORT_ORDER
```

## 8.2 SEZONY

New sheet:

```text
SEASON_ID
NAME
START_DATE
END_DATE
ACTIVE
SORT_ORDER
```

Example synthetic row:

```text
2026-2027
2026/2027
2026-09-01
2027-07-31
TRUE
10
```

Use real Google date values where the adapter supports them safely.

## 8.3 OFERTY_ZAJEC

Target columns:

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

Do not add price, payment method or exact group times until Iwona provides the verified offer audit.

## 8.4 GRUPY

New internal sheet:

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

The sheet may initially exist with headers only until real group data is supplied.

Do not fabricate groups.

## 8.5 ZAPISY schema v3

Preserve existing technical and participant data and extend it.

Recommended target column order for the physical sheet:

### Operator-first section

```text
STATUS
PARTICIPANT_FIRST_NAME
PARTICIPANT_LAST_NAME
BIRTH_DATE
AGE_AT_SUBMISSION
OFFERING_NAME_SNAPSHOT
CITY_NAME_SNAPSHOT
GUARDIAN_FIRST_NAME
GUARDIAN_LAST_NAME
PHONE
EMAIL
SUBMITTED_AT
ASSIGNED_GROUP_ID
CONTACTED_AT
CONFIRMED_AT
NOTES
```

### System section

```text
REGISTRATION_ID
REQUEST_ID
SEASON_ID
SEASON_NAME_SNAPSHOT
OFFERING_ID
CITY_ID_SNAPSHOT
POSSIBLE_DUPLICATE_OF
PRIVACY_NOTICE_VERSION
SOURCE
CREATED_AT
UPDATED_AT
SCHEMA_VERSION
```

The exact physical order can differ if migration complexity requires it because the code maps by header names.

The important requirement is that the operator sees the business columns first.

### New v3 columns

```text
SEASON_ID
SEASON_NAME_SNAPSHOT
ASSIGNED_GROUP_ID
CONTACTED_AT
CONFIRMED_AT
POSSIBLE_DUPLICATE_OF
```

### Do not invent historical data

For v1/v2 rows:

- do not guess birth dates,
- do not guess season,
- do not guess assigned group,
- do not guess contact timestamps.

Nullable historical fields are acceptable.

## 8.6 USTAWIENIA

Keep existing settings and add:

```text
CURRENT_SEASON_ID
```

Potential future settings can be added only when a real use case exists.

Do not move all business configuration into `USTAWIENIA`.

---

# 9. Native Google Sheets behavior

## 9.1 ZAPISY remains a native Google Sheets Table

Do not downgrade it to a decorated range.

The registration append path must continue using the native table body.

## 9.2 Typed columns

Use appropriate native types where reliable:

```text
BIRTH_DATE -> DATE
AGE_AT_SUBMISSION -> DOUBLE
STATUS -> DROPDOWN
CONTACTED_AT -> DATE_TIME if practical
CONFIRMED_AT -> DATE_TIME if practical
SCHEMA_VERSION -> DOUBLE
other identifiers/text -> TEXT
```

Use Polish display formats for dates.

## 9.3 Status dropdown

The native dropdown values must be:

```text
NEW
IN_REVIEW
CONTACTED
WAITLISTED
CONFIRMED
REJECTED
CANCELLED
```

Use clear native Sheets coloring if practical, but do not make color the only meaning.

## 9.4 Operator editable columns

At minimum these must remain editable for Iwona:

```text
STATUS
ASSIGNED_GROUP_ID
CONTACTED_AT
CONFIRMED_AT
NOTES
```

Technical columns remain protected warning-only or harder where the current permission model supports it.

## 9.5 Technical columns

Hide or move technical columns to the right for normal operator work:

```text
REGISTRATION_ID
REQUEST_ID
SEASON_ID
OFFERING_ID
CITY_ID_SNAPSHOT
PRIVACY_NOTICE_VERSION
SOURCE
CREATED_AT
UPDATED_AT
SCHEMA_VERSION
POSSIBLE_DUPLICATE_OF
```

Do not delete them.

## 9.6 Saved views / filter views

Create or document operator views:

```text
Nowe
W trakcie
Do kontaktu / Kontakt
Lista rezerwowa
Potwierdzone
Zamknięte
```

Do not duplicate registration rows into separate status sheets.

One canonical registration table is the source of truth.

---

# 10. Business duplicate detection

This is a core v3 feature.

It must remain separate from `requestId` idempotency.

## 10.1 Two different problems

### Technical idempotency

Same browser submission / retry:

```text
same requestId
```

Current behavior stays.

### Business duplicate

User opens or reloads the form later:

```text
new requestId
same participant
same offering
same season
```

This requires new logic.

## 10.2 Canonical comparison fields

Build a business identity key in memory from:

```text
normalized participant first name
normalized participant last name
exact BIRTH_DATE
CITY_ID
OFFERING_ID
SEASON_ID
```

Do not store a reversible or easily brute-forced PII fingerprint only to optimize this.

### Name normalization for comparison

Use:

- Unicode normalization, preferably NFC,
- existing trim behavior,
- collapse internal repeated whitespace,
- case-insensitive comparison,
- preserve apostrophes,
- preserve hyphens,
- preserve diacritics.

Do not strip all punctuation and accents because that creates false positives.

### Contact normalization

Use:

```text
PHONE -> existing E.164
EMAIL -> existing normalized email
```

## 10.3 Exact active duplicate

An existing registration is an **exact duplicate** when:

1. participant identity key matches,
2. normalized phone matches,
3. normalized email matches,
4. existing registration is not in a status that allows a fresh request.

Statuses that should normally count as an existing active/request record:

```text
NEW
IN_REVIEW
CONTACTED
WAITLISTED
CONFIRMED
```

Statuses that allow a new request:

```text
REJECTED
CANCELLED
```

This status rule must be covered by tests.

## 10.4 Exact duplicate response

Do not append a new row.

Return a safe successful response such as:

```json
{
  "ok": true,
  "duplicate": true
}
```

Suggested user copy:

```text
Wygląda na to, że takie zgłoszenie już mamy.
Nie musisz wysyłać go ponownie. Pozytywka skontaktuje się z Tobą po jego weryfikacji.
```

Do not expose:

- existing status,
- existing phone,
- existing email,
- guardian information,
- internal notes,
- assigned group.

Do not build a public "check whether a child exists" endpoint.

## 10.5 Probable duplicate

When the participant identity key matches but phone and/or email differ:

- do not block,
- create the new registration,
- set:

```text
POSSIBLE_DUPLICATE_OF=<most relevant existing registration id>
```

- do not tell the public user that an older record exists,
- highlight the possible duplicate to Iwona in admin email and Sheets.

Why:

- another parent may submit,
- contact details may have changed,
- an old entry may contain a typo,
- silently blocking could lose a legitimate correction.

## 10.6 Legacy rows

v1 rows may not have `BIRTH_DATE`.

They must not be used for hard exact duplicate blocking based on guessed identity.

A legacy row may be surfaced as a possible duplicate only with a conservative rule, for example:

- same participant name,
- same offering/city,
- same normalized phone or email.

No hard blocking without reliable date of birth.

## 10.7 Multiple activities are valid

Same participant:

```text
Hip-hop
```

and:

```text
Contemporary
```

must produce two independent registrations.

This is not a duplicate.

## 10.8 New season is valid

Same participant + same offering:

```text
season 2026/2027
```

and:

```text
season 2027/2028
```

are independent registrations.

## 10.9 Concurrency limitation

Google Sheets is not a transactional database.

Two truly simultaneous requests with different request IDs could theoretically both:

1. pass the business duplicate read,
2. append before either sees the other.

Therefore v3 duplicate detection is a **strong soft-deduplication mechanism**, not a database uniqueness constraint.

Do not claim otherwise.

Add reconciliation that can detect business duplicate candidates after the fact.

If hard atomic uniqueness becomes a business requirement, trigger a storage review and likely move registrations to PostgreSQL/Supabase.

---

# 11. Repository changes for duplicate detection

Current registration repository is too small.

Target conceptual interface:

```ts
export interface RegistrationRepository {
  findByRequestId(requestId: RequestId): Promise<Registration | null>;

  findPotentialDuplicates(
    criteria: RegistrationDuplicateCriteria,
  ): Promise<readonly Registration[]>;

  create(registration: Registration): Promise<void>;
}
```

`findPotentialDuplicates` should be server-only.

For Google Sheets at Pozytywka's expected scale:

- a bounded read and in-memory comparison is acceptable,
- avoid premature indexing infrastructure,
- document a scale trigger for re-evaluation.

Do not make the browser perform duplicate checks.

---

# 12. Submission application service order

`submitRegistration()` should conceptually execute in this order:

```text
1. Parse request with Zod.
2. Normalize names, phone and email.
3. Calculate age at submission.
4. Validate minimum fill time / anti-bot fields.
5. Check existing requestId.
6. If same requestId:
   - verify same logical request,
   - return idempotent replay.
7. Read catalog + settings + current season.
8. Verify registrations are globally open.
9. Verify privacy configuration when required.
10. Verify current season exists and is active.
11. Verify selected city exists.
12. Verify selected offering belongs to city.
13. Compute offering intake status for current date.
14. Reject unavailable/closed offering.
15. Run business duplicate detection.
16. Exact duplicate:
   - no append,
   - return duplicate-success result.
17. Probable duplicate:
   - create registration with POSSIBLE_DUPLICATE_OF.
18. Normal request:
   - create registration.
19. Schedule notifications only after successful persistence.
```

Transport replay and business duplicate detection must remain conceptually different.

---

# 13. Offering availability logic

The server must be the source of truth.

Do not rely on a disabled browser option alone.

Compute a public intake result:

```ts
type PublicIntakeStatus =
  | "OPEN"
  | "WAITLIST_ONLY"
  | "UPCOMING"
  | "CLOSED";
```

## 13.1 Manual closed state

If:

```text
ACTIVE = FALSE
```

the offering is not a normal public option.

If:

```text
INTAKE_STATE = CLOSED
```

submission is denied even when date window would otherwise be open.

## 13.2 Windowed offering

Before `REGISTRATION_OPEN_FROM`:

```text
UPCOMING
```

Inside window:

manual `INTAKE_STATE` determines `OPEN`, `WAITLIST_ONLY` or `CLOSED`.

After `REGISTRATION_OPEN_TO`:

```text
CLOSED
```

unless a future explicit business rule says the waiting list remains open after the normal window.

Do not invent that rule.

## 13.3 Rolling offering

No date-window restriction unless configured later.

Manual intake state remains authoritative.

---

# 14. Public form UX v3

## 14.1 Keep it one page

Do not create a three-page wizard for the current amount of data.

Remove or redesign the fake stepper.

Use clear sections:

```text
Zajęcia
Uczestnik
Rodzic lub opiekun
Kontakt
```

## 14.2 Header explanation

The page should state the real workflow early.

Suggested concept:

```text
Wybierz miasto i zajęcia, a następnie podaj dane uczestnika.
Po wysłaniu Pozytywka sprawdzi zgłoszenie i skontaktuje się z Tobą, aby dobrać odpowiednią grupę i termin.
```

Keep it concise.

## 14.3 Offering selection

Open offering:

```text
Hip-hop
```

Waitlist-only offering:

```text
Hip-hop - obecnie lista rezerwowa
```

Upcoming/closed offerings can be visible but disabled if UX testing confirms this is clearer than hiding them.

Do not display internal group times until the business wants that behavior.

## 14.4 Date-of-birth description

Replace the current narrower explanation with:

```text
Data urodzenia pomaga nam dobrać odpowiednią grupę wiekową oraz ustalić, czy potrzebujemy danych rodzica lub opiekuna.
```

## 14.5 Minor flow

For under-18 participant:

show guardian fields.

Continue to make contact copy clear:

```text
Podaj telefon i e-mail rodzica lub opiekuna odpowiedzialnego za zgłoszenie.
```

## 14.6 Guardian relationship

Potential field:

```text
GUARDIAN_RELATIONSHIP
```

Possible values:

```text
RODZIC
OPIEKUN_PRAWNY
INNA_OSOBA
```

**Do not implement yet.**

First ask Iwona whether:

- grandparents regularly submit,
- other authorized adults submit,
- Pozytywka needs this distinction operationally.

Avoid adding data without a real purpose.

## 14.7 Before-submit explanation

Near the button include a short statement:

```text
Wysłanie formularza jest zgłoszeniem na zajęcia.
Pozytywka musi je najpierw zweryfikować i potwierdzić odpowiednią grupę.
```

No generic GDPR consent checkbox.

## 14.8 Success screen

Target:

```text
Dziękujemy, mamy zgłoszenie

Otrzymaliśmy zgłoszenie [participant] na [offering] w [city].

Co dalej?
Pozytywka sprawdzi dostępne grupy i skontaktuje się z Tobą, żeby ustalić odpowiednią grupę i termin.

Samo wysłanie formularza nie oznacza jeszcze potwierdzenia miejsca.

Potwierdzenie wysłaliśmy również na podany adres e-mail.
```

Do not promise a response SLA such as "within 24 hours" until Iwona explicitly commits to it.

## 14.9 Duplicate success screen

For exact duplicate:

```text
Takie zgłoszenie jest już w systemie

Nie musisz wysyłać go ponownie.
Pozytywka skontaktuje się z Tobą po jego weryfikacji.
```

Do not show the previous status.

## 14.10 Repeat registration UX

After successful normal submission offer:

```text
Zapisz kolejne dziecko
Wyślij zgłoszenie na inne zajęcia
```

Implementation should preserve only safe, useful data.

Recommended behavior:

### "Zapisz kolejne dziecko"

Preserve:

- guardian first/last name if current participant was minor,
- phone,
- email,
- city if appropriate.

Clear:

- participant name,
- birth date,
- offering,
- assigned status/result.

Generate a new `requestId`.

### "Inne zajęcia"

Preserve participant + guardian + contact data.

Clear offering.

Generate a new `requestId`.

Do not reuse the previous request ID.

---

# 15. Input normalization rules

Preserve the current text-quality work.

## Person names

While typing:

- no leading whitespace,
- collapse repeated whitespace to one,
- allow valid internal single spaces,
- preserve apostrophes,
- preserve hyphens,
- preserve Unicode names.

Server:

- trim,
- collapse whitespace,
- Unicode-normalize.

## Email

Browser:

- do not leave spaces in the input.

Server:

- trim outside whitespace,
- reject internal whitespace,
- normalize according to the existing email strategy.

## Phone

Keep:

- international selector,
- country flags,
- country-aware formatting,
- E.164 canonical storage,
- server validation.

## Birth date

Keep:

- shadcn/Radix popover/calendar implementation,
- no future date,
- sensible oldest date boundary,
- Polish locale,
- server validation.

---

# 16. Status workflow

Recommended allowed business transitions:

```text
NEW
  -> IN_REVIEW
  -> CONTACTED
  -> WAITLISTED
  -> CONFIRMED
  -> REJECTED
  -> CANCELLED

IN_REVIEW
  -> CONTACTED
  -> WAITLISTED
  -> CONFIRMED
  -> REJECTED
  -> CANCELLED

CONTACTED
  -> WAITLISTED
  -> CONFIRMED
  -> REJECTED
  -> CANCELLED

WAITLISTED
  -> CONTACTED
  -> CONFIRMED
  -> REJECTED
  -> CANCELLED
```

Do not enforce this as a hard database state machine while Iwona edits Sheets directly unless the enforcement can be implemented without making normal operations painful.

At minimum:

- document status meaning,
- validate allowed enum values,
- provide consistent dropdowns,
- highlight impossible values through diagnostics.

---

# 17. Internal group assignment

`ASSIGNED_GROUP_ID` is nullable.

It should normally be populated after Iwona has reviewed/contacted the applicant.

Rules:

- do not auto-assign,
- do not make it required for `NEW`,
- do not require real group data before schema v3 can exist,
- validate the referenced group when an admin write path is eventually built.

While Sheets is the admin surface, group assignment may remain a controlled manual field.

When the actual group catalog arrives from Iwona, evaluate the best Sheets dropdown implementation.

Do not store only a mutable display label if a stable group ID can be stored safely.

---

# 18. Participant confirmation email v3

Current wording that contact happens only if more information is needed is wrong.

Target content:

1. confirm receipt,
2. summarize:
   - participant,
   - city,
   - activity,
3. explain mandatory review/contact,
4. explicitly say this is not yet a place confirmation,
5. optionally include registration number.

Suggested concept:

```text
Dziękujemy za zgłoszenie

Otrzymaliśmy zgłoszenie do Pracowni Twórczej Pozytywka.

Uczestnik: ...
Zajęcia: ...
Miasto: ...

Co dalej?
Pozytywka sprawdzi zgłoszenie i skontaktuje się z Tobą, aby dobrać odpowiednią grupę i termin.

To jest potwierdzenie otrzymania zgłoszenia, a nie potwierdzenie miejsca na zajęciach.
```

Avoid legal boilerplate in the transactional email unless required.

---

# 19. Admin email v3

Admin notification should optimize Iwona's work.

Include:

- participant,
- exact birth date,
- age at submission,
- city,
- offering,
- guardian if minor,
- phone,
- email,
- submitted timestamp,
- probable duplicate warning when applicable.

Do not include unnecessary technical IDs at the top.

If `POSSIBLE_DUPLICATE_OF` exists:

```text
UWAGA: możliwy duplikat wcześniejszego zgłoszenia
```

The internal registration ID may be shown in the admin message.

---

# 20. Google Sheets operator experience

The sheet is the temporary admin panel.

Design for Iwona, not for developers.

## 20.1 Visible-first columns

Iwona should see first:

```text
STATUS
participant
birth date / age
offering
city
guardian
phone
email
submitted date
assigned group
contacted date
confirmed date
notes
```

## 20.2 Technical data

Keep system data but place it later or hide it.

## 20.3 Conditional formatting

Useful examples:

- `NEW`: attention,
- `WAITLISTED`: distinct,
- `CONFIRMED`: success,
- `REJECTED/CANCELLED`: muted.

Never rely on color alone.

## 20.4 Notes policy

Add operator guidance:

```text
NOTES is for information necessary to handle the registration.
Do not store diagnoses, health data or other sensitive information here unless a separate approved process explicitly requires it.
```

## 20.5 UPDATED_AT semantics

Current `UPDATED_AT` is not guaranteed to change when Iwona manually edits a Sheet cell.

Do not pretend otherwise.

For v3 choose one documented approach:

### Preferred short-term option

Document `UPDATED_AT` as application/system-write timestamp only.

Use explicit operational timestamps:

```text
CONTACTED_AT
CONFIRMED_AT
```

for meaningful workflow events.

### Future option

If manual editing pain justifies it, add a version-controlled Google Apps Script or admin UI that updates audit timestamps.

Do not add an unversioned hidden Apps Script during the main schema migration.

---

# 21. Reconciliation v3

Extend the current reconciliation command.

It should remain PII-safe in console output.

Detect:

- duplicate `REQUEST_ID`,
- duplicate `REGISTRATION_ID`,
- missing technical IDs,
- invalid season references,
- invalid offering/city relationships,
- invalid assigned group references when available,
- probable business duplicates,
- exact active business duplicate pairs,
- status enum violations,
- future birth dates,
- impossible `CONTACTED_AT` / `CONFIRMED_AT` sequencing where detectable.

Output technical identifiers, counts and row numbers, not full names/emails/phones.

---

# 22. Privacy and RODO plan

This is not legal advice. Final legal copy must be approved by the business / qualified legal reviewer.

Codex must support compliance but must not invent legal conclusions.

## 22.1 Data minimization

Current public fields are broadly appropriate:

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

Do not add without approved need:

- PESEL,
- home address,
- school,
- diagnosis,
- disability,
- allergies,
- medication,
- health history,
- second emergency contact,
- image consent,
- marketing consent,
- invoice details.

## 22.2 Date of birth purpose

Document the purpose:

```text
matching to an appropriate age group + determining guardian flow
```

## 22.3 No generic GDPR consent checkbox

The form should provide the required information and link to the privacy notice.

Do not implement:

```text
[ ] Wyrażam zgodę na RODO
```

as a fake universal legal basis.

If a genuinely optional purpose later requires consent, keep it separate and voluntary.

## 22.4 Privacy notice must identify

At minimum, the final notice needs approved information covering:

- controller identity,
- controller contact,
- processing purposes,
- legal bases,
- recipients / categories of recipients,
- relevant processors,
- retention period or criteria,
- data-subject rights,
- complaint right,
- whether data provision is required and consequences,
- relevant international-transfer information where applicable.

The current TEST placeholder is not production-ready.

## 22.5 Business identity verification gate

Research candidate:

```text
Pracownia Twórcza Pozytywka. Iwona Pilarz
NIP 6371975064
REGON 122726372
JDG
```

Before legal copy is finalized:

- verify current CEIDG record,
- verify registered address,
- verify correspondence/contact address,
- verify privacy-contact email.

Do not rely on third-party aggregator address data.

## 22.6 Processor inventory

Document the real data flow and agreements for:

- Vercel,
- Google / Google Sheets,
- Resend,
- any later analytics,
- any people with Sheet access.

## 22.7 Access control

Define exactly who may access registration PII.

At current scale this likely includes Iwona and specifically authorized collaborators only.

Do not share the entire Sheet broadly merely because it is operationally convenient.

## 22.8 Retention

Do not choose a random period such as 180 days.

First obtain a business/legal decision for at least:

```text
REJECTED
CANCELLED
CONFIRMED
WAITLISTED
```

Then implement a documented retention procedure.

Possible technical outcomes later:

- deletion,
- anonymization,
- archive with restricted access where legally justified.

## 22.9 Data subject requests

Create an operational procedure for:

- access request,
- correction,
- deletion where applicable,
- objection / restriction where applicable.

The application does not need a self-service account in v3.

---

# 23. Child-protection organizational gate

Before production launch record evidence that Pozytywka has addressed the Polish child-protection obligations applicable to artistic / interest-development activity involving minors.

Checklist:

```text
[ ] Standardy Ochrony Małoletnich exist
[ ] full version available
[ ] child-friendly / shortened version available where required/applicable
[ ] staff/instructor verification procedure exists
[ ] persons actually working with minors have been handled under the required procedure
[ ] responsibilities for responding to concerns are defined
```

This is a business/legal gate, not an extra public-form checkbox.

Do not put criminal-record data or child-protection staff records into the registration Sheet.

---

# 24. Contract and payments discovery

The public form does not conclude the paid class agreement.

That is intentional.

Still unresolved:

- when exactly the paid participation agreement is concluded,
- whether during a phone call, message exchange, in person or by a separate document,
- payment frequency,
- transfer vs cash rules,
- cancellation/resignation rules,
- theatre-specific obligations.

Do not put these rules into public form copy until Iwona provides them.

Create a separate audit task before building:

- payments,
- online checkout,
- formal enrollment contract,
- resignation automation.

---

# 25. Security and abuse prevention

## 25.1 Preserve current controls

Keep:

- JSON-only API,
- request body limit,
- honeypot,
- minimum fill time,
- server validation,
- PII-safe logs,
- no privileged browser credentials,
- WIF,
- security headers.

## 25.2 Rate limiting / Turnstile

Before a larger public campaign or production opening, add an abuse-protection decision.

Preferred direction:

- server-side rate limiting and/or
- Cloudflare Turnstile or equivalent privacy-conscious bot challenge.

Do not make CAPTCHA the first user experience if normal traffic does not require it.

## 25.3 Duplicate detection is not anti-abuse

Do not treat business dedupe as rate limiting.

An attacker can vary data.

## 25.4 No PII in monitoring

Metrics may contain:

- request counts,
- status codes,
- latency,
- error codes,
- technical request/registration IDs where needed.

Do not log request bodies.

---

# 26. Marketing and analytics scope

The registration form should stay focused and `noindex`.

A future Pozytywka website can handle:

- SEO,
- detailed offering pages,
- instructors,
- projects,
- social proof,
- photos,
- theatre history,
- FAQs.

Do not turn the form into a giant marketing homepage.

## Future P2 attribution

Potential fields:

```text
UTM_SOURCE
UTM_MEDIUM
UTM_CAMPAIGN
UTM_CONTENT
```

Only implement after the core registration workflow is stable and privacy documentation is updated.

`SOURCE=WEB` can remain for v3 core.

---

# 27. Real-data audit still required from Iwona

Codex must not block foundational engineering on unavailable business data, but it must not invent these values.

Need from Iwona:

## Offer catalog

For every city:

- public activity name,
- short description,
- rolling or windowed,
- whether waiting list is allowed,
- current intake state,
- registration window if windowed.

## Internal groups

For every real group:

- season,
- linked offering,
- internal name,
- age range,
- day,
- start/end time,
- venue,
- instructor,
- rough capacity if tracked.

## Theatre

Need exact answers:

- registration opening date,
- registration closing date,
- whether there is an audition,
- when roles are assigned,
- when no new participant may join,
- waiting-list behavior,
- resignation rules after casting.

## Operations

Need confirmation:

- how quickly Iwona normally contacts a request,
- whether she prefers phone, SMS, Messenger, email,
- what exactly makes a request `CONFIRMED`,
- how she wants to treat unanswered contact attempts.

Do not invent an SLA.

---

# 28. Schema migration v2 -> v3

Must be explicit and versioned.

Target:

```text
SYSTEM_SCHEMA_VERSION = 3
REGISTRATION_SCHEMA_VERSION = 3
```

## 28.1 Before migration

1. Confirm TEST only.
2. Set `REGISTRATIONS_OPEN=FALSE`.
3. Create a full backup.
4. Run existing:
   - `sheet:validate`
   - `diagnostics`
   - reconciliation.
5. Record table metadata.
6. Ensure no uncontrolled public testing is happening.

## 28.2 Migration operations

Conceptually:

1. Create `SEZONY` if missing.
2. Create `GRUPY` if missing.
3. Extend `OFERTY_ZAJEC` headers.
4. Extend `ZAPISY` headers.
5. Update native table range/column metadata.
6. Replace status dropdown values.
7. Update editable/protected-column sets.
8. Add `CURRENT_SEASON_ID` setting.
9. Set system schema version only after all previous operations succeed.
10. Do not fill unknown historical values.

## 28.3 Idempotency

Migration must:

- detect already-applied v3,
- safely no-op or validate,
- fail closed on unknown schema version,
- not create duplicate sheets/columns,
- not overwrite existing operator data.

## 28.4 Rollback

Rollback plan is restore-from-backup, not a complex automatic reverse migration.

Do not promise automatic rollback when Google Sheets batch operations have partially succeeded unless actually implemented and tested.

---

# 29. Test data cleanup plan

Before v3 functional QA:

1. Backup current TEST.
2. Close registrations.
3. Delete real/manual PII test rows.
4. Keep one clearly documented synthetic fixture set.
5. Use synthetic identities such as:

```text
Anna Testowa
Jan Przykładowy
```

6. Use reserved/non-real email patterns where supported by the email testing strategy.
7. Do not send real external emails from routine E2E.
8. Use explicit integration-test flags for real Google writes.

Old inconsistent TEST snapshot rows should not be treated as product truth.

---

# 30. Testing plan

## 30.1 Unit tests

Add coverage for:

### Offering intake

- rolling open,
- rolling closed,
- rolling waitlist,
- windowed before open,
- windowed inside window,
- windowed after close,
- invalid window dates,
- waitlist-only with waitlist disabled.

### Season

- valid current season,
- missing current season,
- inactive current season,
- invalid season reference.

### Duplicate detection

- exact duplicate,
- exact duplicate with name case difference,
- repeated whitespace,
- E.164-equivalent phone,
- normalized email,
- probable duplicate with changed phone,
- probable duplicate with changed email,
- same participant different offering,
- same participant same offering different season,
- previous rejected registration allows fresh submission,
- previous cancelled registration allows fresh submission,
- legacy row with no birth date never hard-blocks.

### Status/domain

- allowed enum values,
- serialization/parsing.

## 30.2 Repository tests

For memory repository:

- duplicate query behavior.

For Google adapter:

- schema v3 mapping,
- new headers,
- native table append,
- nullable v3 fields,
- season/group sheet parsing,
- status dropdown metadata validation.

## 30.3 Integration tests on TEST Google Sheet

Synthetic roundtrip:

1. create synthetic v3 registration,
2. read it,
3. verify season,
4. verify DOB,
5. verify default status NEW,
6. verify native table grew,
7. remove own row in `finally`.

Duplicate integration test:

1. insert synthetic registration A,
2. submit exact logical duplicate B with different requestId,
3. verify no second row,
4. submit probable duplicate C with changed contact,
5. verify second row exists and points to A,
6. clean all test rows.

## 30.4 Playwright

Maintain:

- desktop,
- 320 px,
- 430 px,
- Samsung-like mobile profile.

Add:

- offering OPEN selection,
- WAITLIST_ONLY wording,
- CLOSED offering cannot submit,
- exact duplicate success flow,
- normal success "what next" copy,
- another-child flow,
- another-offering flow,
- guardian conditional fields,
- adult flow,
- DOB boundary around 18,
- no horizontal overflow,
- keyboard navigation,
- Radix Select accessibility,
- Date Picker accessibility.

## 30.5 Manual release QA

Before PROD:

- physical Samsung Chrome,
- iPhone Safari,
- desktop Chrome,
- full keyboard-only flow,
- zoom/reflow,
- focus rings,
- screen-reader spot check if possible,
- successful email delivery,
- admin email delivery,
- Sheet operator test with Iwona.

---

# 31. Email reliability

Current best-effort email is acceptable for core v3.

Keep:

- persistence success is primary,
- participant/admin mail failure must not delete or roll back the registration.

P2:

- durable email outbox / reconciliation.

Do not block v3 schema on a full queue system.

---

# 32. Deployment and environment plan

## 32.1 Branch strategy

Use:

```text
feature branch
-> PR
-> green CI
-> squash merge preview
-> canonical preview deployment
-> TEST smoke
```

Do not ask users to test ephemeral feature URLs as the canonical environment.

## 32.2 Canonical preview

Always verify the stable preview alias points to the expected commit before QA.

## 32.3 Vercel deployment filtering

Investigate actual Vercel behavior against official `git.deploymentEnabled` semantics.

Acceptance condition:

- push to `feat/*` does not create an unwanted Vercel deployment,
- push/merge to `preview` does create staging deployment,
- `main` behavior remains intentional.

Do not solve quota problems by generating more commits.

## 32.4 TEST registrations state

Default operational posture:

```text
REGISTRATIONS_OPEN=FALSE
```

when TEST is not under active controlled QA.

Open only for defined test sessions.

## 32.5 PROD

PROD remains fail-closed until:

- legal gate complete,
- business catalog complete,
- PROD Google identity complete,
- final privacy configuration,
- email sender ready,
- operator access approved,
- release checklist green.

---

# 33. PR-by-PR implementation roadmap

Do not implement all of v3 in one giant PR.

## PR 0 - `docs/v3-product-truth`

**Goal:** eliminate documentation contradictions before code changes.

Update:

- `PRODUCT.md`
- `docs/DECISIONS.md`
- `docs/DATA_MODEL.md`
- `docs/OPERATIONS.md`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/RELEASE_CHECKLIST.md`

Add this plan or its canonical repository version.

Must explicitly supersede the old decision:

```text
"age integer, no DOB"
```

and old schema-v1-only statements.

**No runtime code changes.**

Acceptance:

```text
pnpm check
```

green.

---

## PR 1 - `chore/test-hygiene-and-preview`

**Goal:** make TEST trustworthy again.

Tasks:

- diagnose Vercel feature deployment filtering,
- verify canonical preview commit,
- document TEST open/closed procedure,
- close TEST outside controlled QA,
- backup current TEST,
- clean manual PII test rows,
- leave synthetic fixtures only.

No PROD writes.

Acceptance:

- preview behavior verified,
- TEST privacy placeholder cannot accidentally become a public real-data workflow,
- synthetic-only normal QA.

---

## PR 2 - `feat/sheets-schema-v3-foundation`

**Goal:** add structural model without changing the public user flow more than required.

Add domain concepts:

- Season ID/type,
- registration mode,
- intake state,
- schema v3 registration fields.

Add Google structure:

- `SEZONY`,
- `GRUPY`,
- new `OFERTY_ZAJEC` columns,
- new `ZAPISY` columns,
- `CURRENT_SEASON_ID`.

Implement migration v2 -> v3.

Update table column types and protections.

Do not fabricate real groups or prices.

Acceptance:

- migration tested on scratch copy,
- backup exists,
- TEST migration succeeds,
- old rows preserved,
- `sheet:validate` green,
- diagnostics green,
- `pnpm check`,
- E2E.

---

## PR 3 - `feat/offering-intake-rules`

**Goal:** represent rolling/windowed/open/waitlist/closed behavior.

Implement:

- server calculation of intake status,
- public catalog fields,
- server submit revalidation,
- disabled/annotated unavailable offerings,
- waitlist-only public messaging.

No automatic group assignment.

Acceptance:

- unit matrix for all intake modes,
- direct API cannot submit CLOSED offering,
- frontend and backend agree,
- date boundaries use the intended Poland-local date rules.

---

## PR 4 - `feat/registration-business-deduplication`

**Goal:** prevent obvious duplicate submissions without blocking legitimate registrations.

Implement:

- duplicate criteria types,
- repository method,
- exact active duplicate logic,
- probable duplicate logic,
- `POSSIBLE_DUPLICATE_OF`,
- safe duplicate API result,
- duplicate success UI,
- admin duplicate warning,
- reconciliation extension.

Important:

- requestId logic runs first,
- legacy rows never hard-block without DOB,
- different offering is valid,
- different season is valid,
- closed previous request can be resubmitted.

Acceptance:

- unit tests,
- repository tests,
- Playwright,
- real TEST integration using synthetic data,
- row-count assertion that exact duplicate does not append.

---

## PR 5 - `feat/registration-workflow-statuses`

**Goal:** make Sheet status reflect actual Iwona workflow.

Replace enum with:

```text
NEW
IN_REVIEW
CONTACTED
WAITLISTED
CONFIRMED
REJECTED
CANCELLED
```

Update:

- domain,
- Google dropdown,
- validators,
- diagnostics,
- documentation,
- tests.

Add:

- `CONTACTED_AT`,
- `CONFIRMED_AT`.

Do not invent automatic timestamps if Iwona still edits manually.

---

## PR 6 - `feat/operator-sheets-experience`

**Goal:** make Google Sheets usable as a mini operational console.

Tasks:

- operator-first column ordering or visibility,
- hide technical columns,
- preserve technical protection,
- make operator fields editable,
- status formatting,
- useful filter views,
- duplicate visual indicator,
- group-assignment field ready.

Do not duplicate data into one tab per status.

Acceptance includes manual Iwona review.

---

## PR 7 - `feat/registration-copy-and-repeat-flow`

**Goal:** align UX with real business process.

Implement:

- remove fake stepper,
- better header explanation,
- improved DOB purpose copy,
- pre-submit "request, not confirmation" copy,
- new success screen,
- corrected participant email,
- corrected admin email,
- "another child",
- "another activity".

Acceptance:

- mobile E2E,
- keyboard flow,
- no accidental old request ID reuse.

---

## PR 8 - `feat/group-catalog-operations`

**Blocked on real Iwona group data.**

Goal:

- populate/validate actual `GRUPY`,
- establish group ID conventions,
- operator assignment workflow,
- validate season/offering/group relationships.

Do not start until real data exists.

No public user selection of group.

---

## PR 9 - `chore/privacy-retention-readiness`

**Goal:** close legal/operational release gates.

External input required.

Tasks:

- verify current JDG details,
- approve privacy notice,
- processor inventory,
- access list,
- retention policy,
- data-subject request procedure,
- Standardy Ochrony Małoletnich evidence in release checklist,
- staff-verification evidence gate,
- NOTES policy.

Codex may implement the approved legal text but must not authoritatively invent the legal basis or retention period.

---

## PR 10 - `feat/abuse-hardening`

Before broad public launch or campaign:

- decide rate limiter,
- Turnstile if justified,
- abuse telemetry without PII,
- test bot failure paths.

Do not degrade normal mobile UX unnecessarily.

---

## PR 11 - `chore/prod-readiness`

Tasks:

- PROD schema v3,
- PROD service account,
- PROD WIF,
- PROD Sheet access review,
- production Resend sender,
- env validation,
- closed smoke test,
- manual device tests,
- final release checklist.

Only after all gates:

```text
REGISTRATIONS_OPEN=TRUE
```

---

# 34. Acceptance criteria for v3 core

v3 core is not complete until all are true:

## Product

- public user chooses city + public activity, not internal group,
- form states that Pozytywka reviews and contacts,
- no automatic-place implication,
- waiting-list workflow exists,
- rolling and windowed offerings are representable,
- adult participants still work.

## Data

- season stored for new registrations,
- native registration table preserved,
- internal groups have a place in the model,
- exact duplicates are not appended,
- probable duplicates are flagged,
- old data is not fabricated,
- new statuses are available.

## UX

- no fake wizard,
- shadcn controls remain consistent,
- DOB purpose is explained,
- success page says what happens next,
- email says contact will happen,
- another child/activity flow works.

## Operator

- Iwona can identify NEW requests quickly,
- she can set status,
- she can waitlist,
- she can assign a group when group data exists,
- technical columns do not dominate the view,
- possible duplicates are visible.

## Legal/security

- no final PROD without approved privacy notice,
- retention decided,
- processor/access inventory exists,
- child-protection organization gates recorded,
- TEST fixtures are synthetic,
- no PII logs.

## Engineering

- strict TypeScript,
- exact pinned dependencies,
- `pnpm check` green,
- full Playwright green,
- real Google TEST integration green,
- canonical preview commit verified,
- no unintended PROD write.

---

# 35. Explicit non-goals for Codex

Do not add during v3 core unless separately approved:

- Supabase,
- PostgreSQL,
- accounts/login,
- parent portal,
- admin dashboard,
- payment checkout,
- invoice system,
- attendance tracking,
- automatic class scheduling,
- automatic age-based group assignment,
- hard capacity reservation,
- image-consent system,
- health questionnaire,
- marketing automation,
- WhatsApp/Messenger bot,
- SMS sending,
- AI recommendation of groups,
- full Pozytywka marketing website.

The current Google Sheets architecture is still appropriate for the request-intake scale as long as hard transactional capacity is not required.

---

# 36. Triggers for a future database migration

Review Google Sheets as the primary registration store if any of these become true:

1. hard atomic capacity reservation is required,
2. online payments are added,
3. user accounts are added,
4. many operators edit concurrently,
5. strict audit/event history is required,
6. thousands/tens of thousands of active rows make dedupe scans operationally poor,
7. hard uniqueness guarantees are required,
8. attendance/member lifecycle becomes part of the same application.

At that point:

```text
PostgreSQL / Supabase
```

is likely more appropriate, with Sheets becoming reporting/export rather than source of truth.

Do not migrate pre-emptively.

---

# 37. Open decisions that remain intentionally unresolved

These are not bugs in the plan.

Codex must not guess them.

## From Iwona

- real city list,
- real offering list,
- current internal groups,
- exact group age ranges,
- exact schedules,
- real instructors,
- capacities,
- price information,
- payment method,
- contract-conclusion process,
- resignation rules,
- theatre audition/casting details,
- theatre registration window,
- response/contact SLA,
- guardian relationship requirement,
- exact privacy contact email,
- confirmed CEIDG/contact address,
- approved retention periods.

## From product owner after Iwona audit

- whether closed offerings remain visible,
- whether waitlist-only submissions start as NEW or directly WAITLISTED,
- whether `CONTACTED_AT` is first contact or last contact,
- whether operational group assignment needs an Apps Script helper,
- whether UTM attribution belongs in v3.1.

---

# 38. Recommended immediate next action

Do **not** start by adding more form fields.

The next safe order is:

```text
1. Commit this v3 product truth to repository docs.
2. Clean TEST data and deployment workflow.
3. Build schema v3 foundation.
4. Implement offering availability.
5. Implement business deduplication.
6. Implement real status workflow.
7. Improve Sheets operator UX.
8. Improve public copy/email/repeat flow.
9. Insert real Pozytywka group/catalog data after Iwona audit.
10. Close privacy/retention/child-protection release gates.
11. Harden abuse protection.
12. Production rollout.
```

---

# 39. Why this architecture is preferred

## Why public offering, not public group?

Because Pozytywka currently performs human matching after submission.

Forcing the parent to choose an internal group would move a decision to the wrong person and encode information that the parent may not understand.

## Why full birth date?

Because exact age helps Iwona match borderline ages and controls guardian requirements.

## Why Season?

Because the same participant and offering can legitimately recur in another school year, and historical registrations need stable context.

## Why internal Group?

Because Pozytywka ultimately assigns one, even though the public user does not.

## Why waiting list as a status?

Because lack of a current place is not the same as rejection.

## Why two-level duplicate handling?

Because:

- exact same contact + participant + offering + season is almost certainly redundant,
- same participant but changed contact may be a correction or another guardian,
- silently blocking the latter would lose legitimate information.

## Why not a hard uniqueness guarantee?

Because Sheets is not transactional and the current business does not justify adding database infrastructure solely for a rare race condition.

## Why not more PII?

Because the form's purpose is request intake and group matching, not full participant administration.

## Why not a generic GDPR checkbox?

Because privacy compliance depends on purpose, legal basis and transparent information, not a decorative universal consent.

## Why not a full CRM?

Because Iwona currently needs a clear, small operational workflow, and Google Sheets already provides an understandable operator surface.

---

# 40. Source and evidence notes

This plan is based on:

## Current repository and TEST system

- current `preview` source,
- `PRODUCT.md`,
- domain/repository code,
- schema v2 documentation,
- release/security/operations docs,
- current TEST Google Sheet structure and values,
- current canonical Vercel deployment metadata.

## Business decisions confirmed in conversation

- Iwona handles incoming requests,
- group/time is chosen after submission,
- request must be verified,
- Pozytywka contacts the user,
- waiting list is wanted,
- regular groups are broadly September-July and can usually accept people during the season,
- theatre/project model can close after a limited registration period/casting,
- exact DOB is useful for age matching,
- adults should remain technically supported.

## External research

Business data research indicates the JDG:

```text
Pracownia Twórcza Pozytywka. Iwona Pilarz
NIP 6371975064
REGON 122726372
```

with public sources derived from CEIDG.

Institutional/public sources confirm Pozytywka's activity in artistic education, youth groups, vocal-dance work and musical theatre.

Legal review references include:

- Regulation (EU) 2016/679, especially principles of purpose limitation, data minimization and storage limitation,
- Polish Ministry of Justice guidance on Standardy Ochrony Małoletnich and personnel verification under the child-protection legislation,
- the underlying Polish child-protection act provisions,
- official Vercel Git configuration documentation for branch deployment control.

The legal sections are implementation requirements and review gates, not a substitute for individualized legal advice.

---

# 41. Final instruction to Codex

When implementing this plan, optimize for:

```text
correct business meaning
> data integrity
> privacy/security
> mobile user clarity
> operator simplicity
> architectural purity
> feature count
```

If a proposed abstraction makes the code "more enterprise" but makes Iwona's real workflow harder, do not add it.

If a proposed shortcut makes the UI simpler but causes ambiguous records, do not take it.

If a field cannot be justified by a real business purpose, do not collect it.

If a business rule is unknown, encode a safe extension point and mark the decision as unresolved instead of inventing the answer.
