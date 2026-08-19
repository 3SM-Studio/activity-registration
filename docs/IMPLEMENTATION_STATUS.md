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
- TEST service account ograniczony do TEST Sheet i bez dostępu do PROD Sheet.
- Memory repositories dla lokalnego/E2E developmentu.
- Sheet bootstrap, validation, migration, diagnostics, TEST seeding i registration reconciliation.
- Warning-only protected ranges na technicznych kolumnach `ZAPISY` w TEST i PROD, z `STATUS` i `NOTES` pozostawionymi jako operacyjne.
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
- Playwright na desktop, 320 px i 430 px.
- E2E dla same-requestId retry po temporary failure.
- E2E dla focusu pierwszego błędnego pola.
- E2E dla braku horizontal overflow.
- Wzmocniony kontrast obrysów input/select i focus ringów oraz przywrócony natywny affordance selecta.
- Jawny, twardo blokowany do `APP_ENV=test` real-Google roundtrip command `test:integration:sheets`.
- Exact-pinned dependencies i `pnpm-lock.yaml`.
- Publiczne repo jest świadomą decyzją. Sekrety i lokalne env pozostają poza Git.

## Verified gates

Na branchu zawierającym finalne zmiany runtime zweryfikowano:

- `pnpm install --frozen-lockfile` przechodzi,
- repository contract validation przechodzi,
- Prettier przechodzi,
- ESLint przechodzi,
- strict TypeScript przechodzi,
- Vitest: 14/14 files, 67/67 tests,
- Next.js 16.3.0 production build przechodzi,
- Playwright: 21/21 testów na desktop + 320 px + 430 px,
- GitHub Actions CI zakończone sukcesem.

Po synchronizacji dokumentacji CI #53 również zakończyło się sukcesem wraz z pełnym `pnpm check` i Critical E2E.

Dodatkowo zweryfikowano:

- Vercel Preview zawierający finalne zmiany runtime ma stan `READY`,
- publiczny formularz renderuje realny TEST katalog z Google Sheets,
- runtime nie raportował nowych błędów/fatal logs po weryfikacji,
- realny TEST Sheet został odczytany i zapisany przez Vercel WIF,
- realny publiczny Preview submit został zapisany w `ZAPISY` TEST,
- Resend zaakceptował participant + admin notifications,
- participant mailbox delivery została zweryfikowana.

Późniejsze commity są wyłącznie synchronizacją dokumentacji i checklisty; nie zmieniają runtime ani testów.

## Remaining work before PROD

### External product/legal input

- zatwierdzona rzeczywista lista miast,
- zatwierdzona rzeczywista lista zajęć,
- zatwierdzona privacy notice dla zapisów,
- `PRIVACY_NOTICE_URL`,
- `PRIVACY_NOTICE_VERSION`,
- zatwierdzona retention policy i procedura retencji,
- finalny publiczny adres/domena formularza,
- finalne zatwierdzenie warstwy wizualnej przez Pozytywkę.

### Production infrastructure

- utworzyć osobny PROD service account,
- udostępnić PROD Sheet wyłącznie PROD service accountowi oraz zatwierdzonym operatorom,
- dodać production WIF subject wyłącznie do PROD service accountu,
- ustawić komplet Vercel Production env,
- ustawić produkcyjnego nadawcę Resend,
- ustawić `REGISTRATION_ADMIN_EMAILS=pozytywka.boleslaw@gmail.com`,
- potwierdzić mailbox delivery admin notification,
- potwierdzić unieważnienie wcześniej ujawnionego/testowego klucza Resend,
- wykonać production smoke test przy `REGISTRATIONS_OPEN=FALSE`,
- dopiero po przejściu release gate ustawić `REGISTRATIONS_OPEN=TRUE`.

### Remaining verification gates

- uruchomić nowy `APP_ENV=test DATA_BACKEND=google-sheets ALLOW_TEST_SEED=true pnpm test:integration:sheets` na realnym TEST Sheet,
- wykonać ręczny pełny flow klawiaturą,
- ręcznie potwierdzić widoczność focus ringów i reflow/zoom,
- wykonać real-device mobile smoke test,
- zaakceptować PR #1, następnie merge/retarget PR #2 w poprawnej kolejności.

## Deferred, not original MVP blockers

- durable email outbox/reconciliation, issue #3,
- twarde limity miejsc,
- waitlist,
- panel administratora,
- płatności,
- PostgreSQL/Supabase migration.

## Release statement

System jest działającym i zweryfikowanym TEST/Preview MVP. Wszystkie znane techniczne braki, które można było zamknąć bez danych biznesowych, decyzji prawnych, PROD IAM i ręcznej akceptacji UI, są zaimplementowane na branchu. PROD pozostaje celowo fail-closed do czasu zamknięcia pozostałych gate'ów.
