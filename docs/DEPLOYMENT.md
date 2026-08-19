# Deployment

## Environments

```text
development -> memory albo TEST Sheet przez lokalne ADC
preview     -> TEST Sheet przez TEST service account
production  -> PROD Sheet przez osobny PROD service account
```

Preview nie może dostać produkcyjnego `GOOGLE_SPREADSHEET_ID` ani tożsamości mającej dostęp do PROD.

## Branch model

```text
feature/*
-> Pull Request do preview
-> CI
-> merge do preview
-> stały Vercel Preview TEST
-> realny smoke/E2E
-> Pull Request preview -> main
-> CI
-> merge do main
-> Vercel Production
```

`preview` jest jedyną gałęzią, która może przyjmować testowe zgłoszenia na Vercelu. Zwykłe feature branche mogą mieć automatyczne deploymenty Vercel Preview, ale aplikacja musi na nich działać fail-closed i `POST /api/registrations` ma zwracać 503.

Hotfix produkcyjny może wyjątkowo wejść bezpośrednio do `main`, ale po opanowaniu incydentu musi zostać zsynchronizowany z `preview`.

## Aktualny stan infrastruktury

Zweryfikowane 2026-08-19:

```text
Vercel project      pozytywka-activity-registration
Vercel framework    nextjs
Production branch   main
Preview branch      preview
GCP project         pozytywka-reg-3sm-260819
GCP project number  656375661462
```

Google Sheets:

```text
TEST  11-wmT8OCSVinFNjAFE7oHvIYUKnVOBgxmwIgvGgWH-8
PROD  1YvPxYSPHkiWetpYjPfCq-KrXncjGy6bSCWIIwjl-v38
```

Oba arkusze mają kontrakt:

```text
MIASTA
OFERTY_ZAJEC
ZAPISY
USTAWIENIA
```

TEST zawiera syntetyczny katalog do testów. PROD ma `REGISTRATIONS_OPEN=FALSE`, nie ma zatwierdzonego katalogu ani privacy notice i pozostaje fail-closed.

## Izolacja TEST i PROD

TEST i PROD muszą używać różnych service accountów.

Aktualny TEST service account:

```text
activity-registration@pozytywka-reg-3sm-260819.iam.gserviceaccount.com
```

Ma dostęp wyłącznie do TEST Sheeta i impersonację wyłącznie dla Vercel Preview.

PROD service account nie jest jeszcze utworzony. Przed produkcją utwórz osobny, np.:

```text
activity-registration-prod@pozytywka-reg-3sm-260819.iam.gserviceaccount.com
```

Następnie:

1. udostępnij mu wyłącznie PROD Sheet,
2. binduj wyłącznie Vercel subject `environment:production`,
3. ustaw jego adres jako `GCP_SERVICE_ACCOUNT_EMAIL` tylko w Vercel Production.

Nie udostępniaj PROD Sheeta TEST service accountowi.

## Google WIF

Pool i provider:

```text
pool:     vercel
provider: vercel
issuer:   https://oidc.vercel.com/atypicalmichas
```

Kanoniczny audience używany przez aplikację i dopuszczony przez provider:

```text
//iam.googleapis.com/projects/656375661462/locations/global/workloadIdentityPools/vercel/providers/vercel
```

Preview subject:

```text
owner:atypicalmichas:project:pozytywka-activity-registration:environment:preview
```

Production subject, jeszcze nieprzyznany:

```text
owner:atypicalmichas:project:pozytywka-activity-registration:environment:production
```

Vercel OIDC nie zawiera branch name w `sub`, dlatego izolacja gałęzi `preview` jest dodatkowo wymuszana w aplikacji przez `VERCEL_GIT_COMMIT_REF`.

Szczegółowy runbook: `docs/GCP_WIF_SETUP.md`.

## E-mail przez Resend

Wysyłane są dwa maile po skutecznym zapisie do źródła danych:

1. potwierdzenie otrzymania zgłoszenia do osoby zapisującej,
2. powiadomienie administracyjne z `reply_to` ustawionym na adres ze zgłoszenia.

Awaria e-maila nie cofa zapisu. Powiadomienia są wykonywane przez Next.js `after()` po zapisaniu rejestracji. Resend dostaje stabilny `Idempotency-Key` oparty o typ wiadomości i ID rejestracji.

To jest mechanizm best-effort. Trwały outbox/reconciliation pozostaje osobnym hardeningiem opisanym w issue #3.

### Preview

Stały branch `preview` używa Resend do pełnego E2E:

```text
EMAIL_PROVIDER=resend
EMAIL_FROM=Pracownia Twórcza Pozytywka <zapisy@3stupidmen.com>
REGISTRATION_ADMIN_EMAILS=3stupidmenbusiness@gmail.com
RESEND_API_KEY=<Sensitive Preview secret>
```

### Production

Produkcja ma docelowo używać:

```text
EMAIL_PROVIDER=resend
RESEND_API_KEY=<production secret>
EMAIL_FROM=<verified production sender>
REGISTRATION_ADMIN_EMAILS=pozytywka.boleslaw@gmail.com
```

Nie kopiuj testowego odbiorcy administracyjnego do Production.

## Vercel Preview env

Branch-specific Preview dla `preview`:

```text
APP_ENV=test
DATA_BACKEND=google-sheets
GOOGLE_SPREADSHEET_ID=11-wmT8OCSVinFNjAFE7oHvIYUKnVOBgxmwIgvGgWH-8

EMAIL_PROVIDER=resend
EMAIL_FROM=Pracownia Twórcza Pozytywka <zapisy@3stupidmen.com>
REGISTRATION_ADMIN_EMAILS=3stupidmenbusiness@gmail.com
RESEND_API_KEY=<Sensitive>

GCP_PROJECT_ID=pozytywka-reg-3sm-260819
GCP_PROJECT_NUMBER=656375661462
GCP_SERVICE_ACCOUNT_EMAIL=activity-registration@pozytywka-reg-3sm-260819.iam.gserviceaccount.com
GCP_WORKLOAD_IDENTITY_POOL_ID=vercel
GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID=vercel
ALLOW_TEST_SEED=false
```

Nie ustawiaj ręcznie `VERCEL_OIDC_TOKEN` w Vercel Environment Variables.

Jeśli stały `preview` nie ma pełnej konfiguracji powyżej, aplikacja ma pokazać zamknięty stan i odrzucić zapis 503. Nigdy nie może spaść do `memory` i zwrócić fałszywego sukcesu.

## Vercel Production env, przyszły stan

Dopiero po przygotowaniu osobnej tożsamości PROD:

```text
APP_ENV=production
DATA_BACKEND=google-sheets
GOOGLE_SPREADSHEET_ID=1YvPxYSPHkiWetpYjPfCq-KrXncjGy6bSCWIIwjl-v38

EMAIL_PROVIDER=resend
RESEND_API_KEY=<production secret>
EMAIL_FROM=<verified production sender>
REGISTRATION_ADMIN_EMAILS=pozytywka.boleslaw@gmail.com

GCP_PROJECT_ID=pozytywka-reg-3sm-260819
GCP_PROJECT_NUMBER=656375661462
GCP_SERVICE_ACCOUNT_EMAIL=activity-registration-prod@pozytywka-reg-3sm-260819.iam.gserviceaccount.com
GCP_WORKLOAD_IDENTITY_POOL_ID=vercel
GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID=vercel
ALLOW_TEST_SEED=false
```

## Local development z Google

Lokalnie preferowane są Application Default Credentials z impersonacją TEST service accountu. Nie używamy JSON private key.

Lokalny `.env.local` nie powinien zawierać `VERCEL_OIDC_TOKEN`, bo wtedy kod przełączy się z ADC na ścieżkę Vercel WIF.

## Zweryfikowany Preview E2E

2026-08-19 sprawdzono realny flow na wcześniejszym branchu integracyjnym:

```text
Vercel Preview
-> odczyt katalogu z TEST Sheet
-> POST /api/registrations 201
-> zapis do ZAPISY w TEST Sheet
-> registration.submit.succeeded
-> registration.notifications.succeeded
-> mail uczestnika dostarczony do Gmail
```

Po utworzeniu stałego brancha `preview` ten sam gate musi być powtarzany na jego stabilnym URL przed promocją do `main`.

`registration.notifications.succeeded` oznacza brak błędu obu requestów do providera e-mail. Nie traktuj tego jako niezależnego dowodu mailbox delivery wiadomości administracyjnej.

## Production gates

Przed produkcją muszą być zielone:

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test:e2e
APP_ENV=test DATA_BACKEND=google-sheets pnpm sheet:validate
APP_ENV=test DATA_BACKEND=google-sheets pnpm diagnostics
```

Dodatkowo wymagane są:

- osobny PROD service account,
- PROD Sheet udostępniony wyłącznie PROD service accountowi,
- production WIF subject przypięty wyłącznie do PROD service accountu,
- zatwierdzona privacy notice i jej wersja wpisana do `USTAWIENIA`,
- zatwierdzona retention policy,
- prawdziwy katalog miast i zajęć w PROD,
- zweryfikowany produkcyjny nadawca Resend,
- `REGISTRATION_ADMIN_EMAILS=pozytywka.boleslaw@gmail.com`,
- kontrola smoke testu produkcyjnej konfiguracji przy zamkniętych zapisach,
- dopiero na końcu zmiana `REGISTRATIONS_OPEN` w PROD na `TRUE`.
