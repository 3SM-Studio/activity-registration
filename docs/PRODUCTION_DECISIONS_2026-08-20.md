# Pozytywka Registration v3 - production decisions

Date: 2026-08-20
Status: approved production baseline, editable by Pozytywka
Owner: Iwona Pilarz

This document closes the business decisions that were intentionally left open in the original v3 plan. Iwona has confirmed that the project may use these values as the production baseline. They are configuration and operating defaults, not irreversible product constraints.

## 1. Controller and operational contact

- Controller: Pracownia Twórcza Pozytywka. Iwona Pilarz
- NIP: 6371975064
- REGON: 122726372
- Operational/contact address: ul. Browarna 6a, 32-329 Bolesław
- Privacy and registration mailbox: pozytywka.boleslaw@gmail.com
- Operational phone: 602 753 268

If registry or correspondence details change, update the public privacy notice and this document without changing the registration schema.

## 2. Production season

Current season:

- ID: `2026-2027`
- display name: `2026/2027`
- starts: `2026-09-01`
- ends: `2027-07-31`

`CURRENT_SEASON_ID=2026-2027`.

## 3. Public production catalog

Current public city:

- Olkusz

Public offerings:

1. Zajęcia wokalno-taneczne, rolling intake.
2. Wokal, rolling intake.
3. Teatr dziecięcy, rolling intake.
4. Teatr muzyczny, windowed intake from 2026-08-01 through 2026-09-15.
5. Balet, rolling intake.
6. Taniec i akrobatyka, rolling intake.

All current offerings allow an operator-managed waiting-list outcome. The public user selects an Offering, never an internal Group.

Closed/upcoming offerings may remain visible as disabled options when the public UI can explain their state clearly. The server remains authoritative and rejects unavailable submissions.

## 4. Internal production groups

Initial editable operating catalog:

| Group | Offering | Age | Day | Time | Instructor | Capacity |
| --- | --- | ---: | --- | --- | --- | ---: |
| PSIKUSY | Zajęcia wokalno-taneczne | 3-6 | Poniedziałek | 16:00-17:00 | Iwona Pilarz | 14 |
| PSOTKI | Zajęcia wokalno-taneczne | 7-9 | Wtorek | 16:00-17:15 | Iwona Pilarz | 16 |
| POZYTYWKI | Zajęcia wokalno-taneczne | 10-12 | Środa | 16:30-18:00 | Patrycja Tomczyk | 18 |
| BESTI | Wokal | 13-18 | Czwartek | 17:00-18:30 | Weronika Sapronczyk | 18 |
| BEZ KURTYNY | Teatr dziecięcy | 8-12 | Piątek | 16:30-18:00 | Iwona Pilarz | 18 |
| OD POCZĄTKU | Teatr muzyczny | 13-19 | Sobota | 10:00-13:00 | Iwona Pilarz | 36 |
| Szkółka baletu | Balet | 5-8 | Poniedziałek | 17:15-18:15 | Iwona Pilarz | 14 |
| INSIDE | Taniec i akrobatyka | 8-14 | Środa | 18:15-19:30 | Oleg Sapronczyk | 18 |

Locations are currently represented operationally as the relevant Pozytywka room in Olkusz. Exact room wording may be edited directly in `GRUPY`.

Age ranges and capacities support the operator. They do not create automatic admission or hard capacity reservations.

## 5. Theatre intake

For the current `Teatr muzyczny` production baseline:

- registration window: 2026-08-01 through 2026-09-15,
- public submission during the window is a request, not casting acceptance,
- Pozytywka may conduct an internal meeting, workshop or casting after submission,
- concrete role/group assignment is made by Pozytywka after human review,
- after the registration window, new public submissions are closed unless Iwona changes the Offering configuration,
- resignation after casting/role assignment is handled individually under the participation arrangements communicated by Pozytywka and is outside this intake application.

No casting result or role is collected by the public registration form.

## 6. Registration workflow decisions

- `WAITLIST_ONLY` submissions start as `NEW`; Iwona decides whether the person becomes `WAITLISTED`.
- `CONTACTED_AT` means the first successful two-way contact with the applicant.
- Unsuccessful contact attempts may be recorded neutrally in `NOTES`, without sensitive details.
- After three reasonable unsuccessful contact attempts across at least seven calendar days, the request may be set to `CANCELLED`.
- `CONFIRMED` means a concrete group/time or participation arrangement was proposed by Pozytywka and accepted by the adult participant or the responsible parent/guardian.
- `REJECTED` means Pozytywka cannot offer an appropriate participation arrangement.
- `CANCELLED` means the applicant withdrew or the process was administratively closed without rejection.

Operational target: review new requests promptly, normally within three business days. This is an internal service target, not a guaranteed public SLA.

Preferred contact order:

1. phone when practical,
2. e-mail when phone contact is unsuccessful or written detail is useful,
3. SMS or another existing business channel only when used manually by Pozytywka.

The application itself sends transactional e-mail only.

## 7. Contract and payment boundary

The public form does not conclude the paid-services agreement and does not take payment.

The form is a pre-contractual registration request. The participation arrangement is concluded only after Pozytywka proposes the concrete group/time and the adult participant or parent/guardian explicitly accepts the proposal and applicable participation/payment terms through a documented communication channel or separate agreement.

Prices, payment frequency, payment method, detailed resignation rules and production-specific commitments are communicated with the participation arrangement and are not stored in this intake application unless a separate project expands its scope.

This keeps the v3 form truthful even when commercial terms change.

## 8. Guardian relationship

`GUARDIAN_RELATIONSHIP` is not collected in v3. The current purpose requires a responsible adult contact, but does not require classification as parent/legal guardian/other person in the registration database.

If Pozytywka later needs that distinction for a real operational/legal purpose, it must be introduced as a separate schema decision.

## 9. Production Sheet

Canonical v3 Production spreadsheet:

`1DRcWvY8xfZDGjJLWOr8Ax1XsyBw4dWU8C6u9WGNvFfM`

Production remains closed by default:

`REGISTRATIONS_OPEN=FALSE`

The initial production catalog is versioned in `scripts/seed-production-catalog.ts`. The seed is deliberately one-time and refuses to run when `ZAPISY` already contains registrations.

## 10. Source basis

The initial activity/group naming is consistent with public Pozytywka activity references, including PSIKUSY, PSOTKI, POZYTYWKI, BESTI, BEZ KURTYNY, INSIDE, ballet activity and the youth musical-theatre project OD POCZĄTKU.

Schedules, capacities and exact operator assignments in this production baseline are editable operational values approved for launch preparation, not claims that the public sources established those details.
