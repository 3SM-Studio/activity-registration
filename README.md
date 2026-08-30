# Activity Registration

Publiczny system zapisów na zajęcia dla projektów 3SM Studio, obecnie wdrażany dla Pracowni Twórczej Pozytywka.

Status: schema v4 działa na Preview i Production. Production jest wdrożone, a `REGISTRATIONS_OPEN` pozostaje celowo `FALSE` podczas launch hardeningu 2026-08-30. Otwarcie zapisów następuje dopiero po zielonym CI, zweryfikowanym wdrożeniu Production i zamknięciu wymaganych manualnych gate'ów release.

Repozytorium jest świadomie publiczne. Sekrety, tokeny, credentials i PII nie mogą trafiać do Git.

Repo jest publiczne do wglądu, ale nie jest projektem open source. Brak dodatkowej licencji na kopiowanie, modyfikację lub redystrybucję kodu. Szczegóły: `LICENSE`.

## Stack

- Next.js 16.3.3
- React 19.2.8
- TypeScript 6.0.3, strict
- pnpm 11.20.0
- Zod 4.4.3
- React Hook Form 7.86.0
- Tailwind CSS 4.3.3
- Vitest 4.1.11
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

Po skutecznym zapisie Registration aplikacja utrzymuje trwały outbox powiadomień. Każde nowe zgłoszenie ma osobny job potwierdzenia dla uczestnika i powiadomienia administratora. Awaria e-maila nie cofa Registration, ale pozostawia trwały stan do retry/reconciliation zamiast bezpowrotnie gubić wysyłkę.

Pierwsza próba wysyłki odbywa się bezpośrednio po zgłoszeniu. Production ma również zabezpieczony `GET /api/cron/notifications`, autoryzowany przez `CRON_SECRET`, jako dodatkowy reconciliation worker. Na obecnym planie Vercel Hobby awaryjny platformowy cron działa raz dziennie. Szczegóły: `docs/NOTIFICATION_OUTBOX.md`.

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
- `SEZONY`
- `GRUPY`
- `POWIADOMIENIA`

`ZAPISY` jest natywną Google Table `Rejestracje`. `POWIADOMIENIA` jest chronionym technicznym outboxem bez participant PII. `PANEL_OPERATORA` jest celowo zwykłym dashboardem, a nie natywną Google Table.

Systemowe zakładki mają kontrolowany kontrakt nagłówków. Zmiana struktury wymaga jawnej migracji lub structural sync, nie ręcznego dopisania kolumny.

Rutynowa bezpieczna walidacja/operator refresh:

```bash
APP_ENV=test DATA_BACKEND=google-sheets pnpm sheet:bootstrap
APP_ENV=test DATA_BACKEND=google-sheets pnpm sheet:validate
```

Jawna synchronizacja strukturalna:

```bash
APP_ENV=test DATA_BACKEND=google-sheets pnpm sheet:schema-sync
```

Outbox po pierwszym wdrożeniu:

```bash
pnpm notifications:adopt
pnpm notifications:reconcile
pnpm notifications:retry
```

`notifications:adopt` służy wyłącznie do jednorazowego oznaczenia historycznych Registration jako `SKIPPED`, gdy zapisy są zamknięte. Szczegóły: `docs/NOTIFICATION_OUTBOX.md`.

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

CI uruchamia krytyczny zestaw Chromium oraz osobny profil iPhone WebKit.

Przed wdrożeniem Google-backed środowiska:

```bash
APP_ENV=test DATA_BACKEND=google-sheets pnpm sheet:validate
APP_ENV=test DATA_BACKEND=google-sheets pnpm diagnostics
APP_ENV=test DATA_BACKEND=google-sheets ALLOW_TEST_SEED=true pnpm test:integration:sheets
```

`diagnostics` obejmuje także health outboxu: brakujące joby, `FAILED` i wygasłe lease. `pnpm-lock.yaml` jest obowiązkowy przed merge i release.

## TEST / Preview

Zweryfikowany flow:

```text
Vercel Preview
-> Vercel OIDC
-> Google WIF
-> TEST service account
-> TEST Google Sheet read/write
-> Registration API
-> durable notification outbox
-> Resend
```

Preview nie może korzystać z tożsamości mającej dostęp do PROD Sheet. Po hotfixie Production `preview` musi zostać ponownie zsynchronizowany z aktualnym `main`, zanim zostanie uznany za kanoniczny staging następnej zmiany.

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
- `docs/NOTIFICATION_OUTBOX.md`
- `docs/DEPENDENCIES.md`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/RELEASE_CHECKLIST.md`
- `docs/AUDIT_REMEDIATION_2026-08-30.md`

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
- Production pozostaje zamknięte podczas hardeningu i otwieramy je dopiero po przejściu aktualnego release gate.

## Licencja

Kod jest publicznie widoczny, ale nie jest udostępniany na licencji open source. Obowiązują warunki `LICENSE` oraz zasady contribution opisane w `CONTRIBUTING.md`.
