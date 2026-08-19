# Activity Registration

Publiczny system zapisów na zajęcia dla projektów 3SM Studio, obecnie wdrażany dla Pracowni Twórczej Pozytywka.

Status: działający i zweryfikowany TEST/Preview MVP. Produkcja pozostaje celowo fail-closed do czasu zatwierdzenia prawdziwego katalogu, privacy notice, retencji oraz osobnej konfiguracji PROD identity/WIF.

Repozytorium jest świadomie publiczne. Sekrety, tokeny, credentials i PII nie mogą trafiać do Git.

## Stack

- Next.js 16.3.0
- React 19.2.8
- TypeScript 6.0.3, strict
- pnpm 11.20.0
- Zod 4.4.3
- React Hook Form 7.84.0
- Tailwind CSS 4.3.3
- Vitest 4.1.10
- Playwright 1.62.1
- Google Sheets API
- Vercel OIDC + Google Workload Identity Federation
- Resend

## Architektura

```text
Browser
  -> Next.js UI
  -> POST /api/registrations
  -> Application services
  -> Domain
  -> Repository interfaces
  -> Google Sheets adapters
  -> Google Sheets
```

Google Sheets jest adapterem storage, a nie domeną aplikacji.

Po skutecznym zapisie aplikacja planuje best-effort powiadomienia e-mail. Błąd e-maila nie cofa Registration.

## Wymagania lokalne

- Node.js 24.19.0 LTS
- pnpm 11.20.0

Używaj dokładnych wersji przypiętych w `package.json`, `.nvmrc`, `pnpm-lock.yaml` i `docs/DEPENDENCIES.md`.

## Lokalny start bez Google

```bash
corepack enable
pnpm install
cp .env.example .env.local
pnpm dev
```

Domyślnie `DATA_BACKEND=memory`, więc formularz działa na syntetycznym katalogu bez credentials Google. Nie wpisuj do tego trybu realnych PII.

## Google Sheets

Systemowe zakładki:

- `MIASTA`
- `OFERTY_ZAJEC`
- `ZAPISY`
- `USTAWIENIA`

Mają kontrolowany kontrakt nagłówków. Zmiana kolumn systemowych wymaga jawnej migracji, nie ręcznego dopisania kolumny.

Bootstrap TEST:

```bash
APP_ENV=test DATA_BACKEND=google-sheets pnpm sheet:bootstrap
APP_ENV=test DATA_BACKEND=google-sheets pnpm sheet:validate
```

Seed syntetycznego TEST wymaga jawnej flagi:

```bash
APP_ENV=test DATA_BACKEND=google-sheets ALLOW_TEST_SEED=true pnpm seed:test
```

`seed:test` nie czyści istniejących rekordów `ZAPISY`.

Jawny test integracyjny realnego TEST Sheet:

```bash
APP_ENV=test \
DATA_BACKEND=google-sheets \
ALLOW_TEST_SEED=true \
pnpm test:integration:sheets
```

Ta komenda ma twardą blokadę przed `APP_ENV=production`, wymaga jawnej flagi zapisu TEST i używa wyłącznie danych syntetycznych.

## Quality gate

Przed merge:

```bash
pnpm check
pnpm test:e2e
```

Przed wdrożeniem Google-backed środowiska:

```bash
APP_ENV=test DATA_BACKEND=google-sheets pnpm sheet:validate
APP_ENV=test DATA_BACKEND=google-sheets pnpm diagnostics
APP_ENV=test DATA_BACKEND=google-sheets ALLOW_TEST_SEED=true pnpm test:integration:sheets
```

`pnpm-lock.yaml` jest obowiązkowy przed merge i release.

## TEST / Preview

Zweryfikowany flow:

```text
Vercel Preview
-> Vercel OIDC
-> Google WIF
-> TEST service account
-> TEST Google Sheet read/write
-> Registration API
-> Resend
```

Preview nie może korzystać z tożsamości mającej dostęp do PROD Sheet.

## Dokumentacja

Przed większą zmianą przeczytaj:

- `docs/PROJECT_BLUEPRINT.md`
- `docs/DECISIONS.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`
- `docs/DEPLOYMENT.md`
- `docs/OPERATIONS.md`
- `docs/DEPENDENCIES.md`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/RELEASE_CHECKLIST.md`

`PROJECT_BLUEPRINT.md` jest planem bazowym sprzed implementacji. Późniejsze jawne decyzje w `DECISIONS.md` i zweryfikowany stan w `IMPLEMENTATION_STATUS.md` zastępują sprzeczne założenia planu.

## Zasady niepodlegające negocjacji

- brak realnych PII w TEST fixtures,
- brak Google API w domenie,
- frontend nie ma credentials do Google,
- wartości użytkownika do Sheets są zapisywane jako `RAW`,
- mapowanie kolumn odbywa się po nazwach nagłówków,
- nie logujemy payloadu formularza ani PII,
- preview nie używa produkcyjnego arkusza ani produkcyjnej identity,
- produkcja nie korzysta z długowiecznego private key service account,
- sekrety nie trafiają do publicznego repo,
- PROD pozostaje zamknięty, dopóki release checklist nie jest kompletna.
