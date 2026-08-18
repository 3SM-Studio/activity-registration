# Deployment

## Environments

```text
development -> memory albo TEST Sheet
preview     -> TEST Sheet
production  -> PROD Sheet
```

Preview nie może dostać produkcyjnego `GOOGLE_SPREADSHEET_ID` ani tożsamości mającej dostęp do PROD.

## Utworzone Google Sheets

Zasoby utworzone 2026-08-18:

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

TEST zawiera syntetyczny katalog do testów. PROD ma `REGISTRATIONS_OPEN=FALSE` i pustą konfigurację privacy notice, więc pozostaje fail-closed do świadomego uruchomienia.

## Google resources

Przed pierwszym wdrożeniem Google-backed:

1. włącz Google Sheets API,
2. dla OIDC/WIF włącz wymagane API IAM, Security Token Service i Service Account Credentials,
3. utwórz dedykowany service account dla aplikacji,
4. udostępnij TEST i PROD temu service accountowi z minimalnym wymaganym dostępem,
5. utwórz Workload Identity Pool i providery dla Vercel OIDC,
6. mapuj `google.subject` z `assertion.sub`,
7. przyznaj `roles/iam.workloadIdentityUser` tylko dokładnym principalom Vercel, które mają impersonować service account.

Nie przyznawaj impersonacji całemu poolowi, jeśli można ograniczyć ją do konkretnego projektu i środowiska.

Vercel OIDC `sub` zawiera projekt i środowisko, więc PROD powinien być ograniczony do subjectu w rodzaju:

```text
owner:<team>:project:<project>:environment:production
```

Preview powinien używać osobnego principalu i arkusza TEST.

## E-mail przez Resend

Produkcja wymaga `EMAIL_PROVIDER=resend`.

Konfiguracja:

```text
EMAIL_PROVIDER=resend
RESEND_API_KEY=<sending-only key>
EMAIL_FROM=Pracownia Twórcza Pozytywka <zapisy@<zweryfikowana-domena>>
REGISTRATION_ADMIN_EMAILS=<adres Pozytywki, opcjonalnie kilka po przecinku>
```

Wysyłane są dwa maile po skutecznym zapisie do źródła danych:

1. potwierdzenie otrzymania zgłoszenia do osoby zapisującej,
2. powiadomienie administracyjne do Pozytywki z `reply_to` ustawionym na adres kontaktowy ze zgłoszenia.

Awaria e-maila nie cofa zapisu. Powiadomienia są uruchamiane po odpowiedzi HTTP przez Next.js `after()`. Resend dostaje stabilny `Idempotency-Key` oparty o identyfikator zgłoszenia.

Domena nadawcy musi być zweryfikowana w Resend. Preferowany jest dedykowany subdomain wysyłkowy, np. `updates.example.pl`, zamiast głównej domeny.

## Vercel environment values

Produkcja:

```text
APP_ENV=production
DATA_BACKEND=google-sheets
GOOGLE_SPREADSHEET_ID=1YvPxYSPHkiWetpYjPfCq-KrXncjGy6bSCWIIwjl-v38

EMAIL_PROVIDER=resend
RESEND_API_KEY
EMAIL_FROM
REGISTRATION_ADMIN_EMAILS

GCP_PROJECT_ID
GCP_PROJECT_NUMBER
GCP_SERVICE_ACCOUNT_EMAIL
GCP_WORKLOAD_IDENTITY_POOL_ID
GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID
```

Preview:

```text
APP_ENV=test
DATA_BACKEND=google-sheets
GOOGLE_SPREADSHEET_ID=11-wmT8OCSVinFNjAFE7oHvIYUKnVOBgxmwIgvGgWH-8
EMAIL_PROVIDER=disabled
```

Produkcja nie używa JSON private key service account. Kod wymienia krótko żyjący token Vercel OIDC na credentials Google przez Workload Identity Federation i service account impersonation.

## Local development z Google

Preferowane są Application Default Credentials ograniczone do TEST. Realne dane produkcyjne nie są używane lokalnie.

## Flow

```text
feature branch
-> PR
-> CI
-> Vercel Preview z TEST
-> review
-> merge main
-> production
```

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

- zatwierdzona privacy notice i jej wersja wpisana do `USTAWIENIA`,
- zatwierdzona retention policy,
- prawdziwy katalog miast i zajęć w PROD,
- zweryfikowana domena Resend,
- prawdziwy `REGISTRATION_ADMIN_EMAILS`,
- testowy zapis end-to-end na TEST z kontrolą arkusza i obu wiadomości e-mail,
- dopiero na końcu zmiana `REGISTRATIONS_OPEN` w PROD na `TRUE`.
