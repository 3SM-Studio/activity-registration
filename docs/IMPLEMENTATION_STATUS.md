# Implementation status

Date: 2026-08-19

## Current state

MVP core działa na Vercel Preview z realnym TEST backendem Google Sheets.

Zweryfikowany flow:

```text
Browser
-> Vercel Preview
-> Next.js
-> Vercel OIDC
-> Google Workload Identity Federation
-> TEST service account
-> TEST Google Sheet read/write
-> POST /api/registrations 201
-> Resend
```

Potwierdzono również faktyczne dostarczenie maila uczestnika do Gmaila.

## Implemented

- Next.js App Router frontend i API.
- Mobile-first publiczny formularz Pozytywki.
- Dependent city -> offering flow.
- Ukrywanie nieaktywnych miast/ofert i miast bez aktywnej oferty.
- Minor/adult guardian rules wraz z czyszczeniem danych opiekuna po przejściu do 18+.
- Dynamiczne wyjaśnienie, czy kontakt dotyczy uczestnika czy opiekuna.
- Client i server validation.
- Backendowa rewalidacja aktualnego city/offering przy submit.
- Normalizacja telefonu i e-maila.
- Stable request IDs i idempotent retry handling.
- Request ID conflict detection dla zmienionego payloadu.
- Application/domain/infrastructure boundaries.
- Google Sheets REST adapter.
- Header-by-name mapping.
- `RAW` writes.
- Brak automatycznego retry nieidempotentnego append.
- Snapshoty nazw city/offering.
- TEST i PROD spreadsheets rozdzielone.
- Vercel OIDC -> Google WIF dla Preview.
- TEST service account ograniczony do TEST Sheet.
- Memory repositories dla lokalnego/E2E developmentu.
- Sheet bootstrap, validation, migration, diagnostics, TEST seeding i registration reconciliation.
- Honeypot, minimalny czas od renderu do submit i limit payloadu API.
- PII-safe structured logging.
- Security headers.
- Privacy version zapisywana z Registration.
- Production fail-closed bez kompletnej privacy configuration.
- E-mail confirmation + admin notification przez provider-agnostic layer i Resend.
- E-mail wykonywany dopiero po skutecznym persistence przez Next.js `after()`.
- Mail failure nie cofa Registration.
- Transportowy replay nie wysyła maili ponownie.
- Unit tests, Playwright E2E, repository validator, GitHub Actions CI i Dependabot.
- Exact-pinned dependencies i `pnpm-lock.yaml`.
- Publiczne repo jest świadomą decyzją. Sekrety i lokalne env pozostają poza Git.

## Verified gates

- `pnpm check` przechodzi na aktualnym branchu.
- GitHub Actions CI przechodzi.
- Krytyczne E2E Playwright przechodzą.
- Vercel Preview buduje się jako Next.js i osiąga `READY`.
- Realny TEST Sheet został odczytany i zapisany przez Vercel WIF.
- Realny publiczny Preview submit został zapisany w `ZAPISY` TEST.
- Resend zaakceptował participant + admin notifications.
- Participant mailbox delivery została zweryfikowana.

## Remaining work before PROD

### External product/legal input

- zatwierdzona rzeczywista lista miast,
- zatwierdzona rzeczywista lista zajęć,
- zatwierdzona privacy notice dla zapisów,
- `PRIVACY_NOTICE_URL`,
- `PRIVACY_NOTICE_VERSION`,
- zatwierdzona retention policy,
- finalny publiczny adres/domena formularza,
- finalne zatwierdzenie warstwy wizualnej przez Pozytywkę.

### Production infrastructure

- utworzyć osobny PROD service account,
- udostępnić PROD Sheet wyłącznie PROD service accountowi,
- potwierdzić, że TEST identity nie ma dostępu do PROD,
- dodać production WIF subject wyłącznie do PROD service accountu,
- ustawić komplet Vercel Production env,
- ustawić produkcyjnego nadawcę Resend,
- ustawić `REGISTRATION_ADMIN_EMAILS=pozytywka.boleslaw@gmail.com`,
- potwierdzić mailbox delivery admin notification,
- wykonać production smoke test przy `REGISTRATIONS_OPEN=FALSE`,
- dopiero po przejściu release gate ustawić `REGISTRATIONS_OPEN=TRUE`.

### Hardening / quality still being closed on the branch

- mobile boundary E2E dla 320 px i 430 px,
- jawny same-requestId retry E2E,
- accessibility smoke dla focusu i overflow,
- jawny real-Google `test:integration:sheets`, tylko TEST,
- bootstrapowana ochrona ostrzegawcza technicznych kolumn `ZAPISY`,
- synchronizacja dokumentacji z faktycznym zachowaniem.

## Deferred, not original MVP blockers

- durable email outbox/reconciliation, issue #3,
- twarde limity miejsc,
- waitlist,
- panel administratora,
- płatności,
- PostgreSQL/Supabase migration.

## Release statement

System jest działającym i zweryfikowanym TEST/Preview MVP, ale nie jest jeszcze otwartym środowiskiem produkcyjnym Pozytywki. PROD pozostaje celowo fail-closed do czasu zamknięcia powyższych gate'ów.
