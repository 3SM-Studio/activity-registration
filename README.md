# Activity Registration

Publiczny system zgłoszeń na zajęcia dla projektów 3SM Studio, obecnie używany przez Pracownię Twórczą Pozytywka.

## Status

Production jest aktywne i przyjmuje zgłoszenia na ofertę 2026/2027.

Zweryfikowany stan po launch hardeningu 2026-08-30:

- Production branch: `main`
- Production SHA: `5d8628f5bf908b304dcfc172c95d2b8a5c1244f6`
- Vercel deployment: `dpl_5zQbApatboZBQp3J2CX63KT4fn1w`
- deployment state: `READY`
- `REGISTRATIONS_OPEN=TRUE`
- 3 aktywne lokalizacje
- 18 aktywnych ofert
- Next.js 16.3.3
- `check` i `webkit` wymagane przez aktywny GitHub ruleset dla `main` i `preview`
- Production smoke po wdrożeniu: HTTP 200, formularz otwarty, brak nowego klastra warning/error/fatal

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

Google Sheets jest aktualnym adapterem storage. System pozostaje request-intake, nie automatyczną rezerwacją miejsca.

Po skutecznym zapisie Registration aplikacja utrzymuje trwały outbox powiadomień. Każde nowe zgłoszenie ma osobny job potwierdzenia dla uczestnika i powiadomienia administratora. Awaria e-maila nie cofa Registration, tylko pozostawia trwały stan do retry/reconciliation.

Pierwsza próba wysyłki odbywa się bezpośrednio po zgłoszeniu. Production ma również zabezpieczony `GET /api/cron/notifications`, autoryzowany przez `CRON_SECRET`, jako dodatkowy reconciliation worker. Na obecnym planie Vercel Hobby platformowy cron działa raz dziennie. Szczegóły: `docs/NOTIFICATION_OUTBOX.md`.

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

Outbox:

```bash
pnpm notifications:reconcile
pnpm notifications:retry
```

`notifications:adopt` jest jednorazową operacją historyczną i nie powinna być ponownie uruchamiana na obecnym PROD.

## Quality gate

Przed merge:

```bash
pnpm check
pnpm test:e2e
```

CI uruchamia krytyczny zestaw Chromium oraz osobny profil iPhone WebKit. Chronione branche wymagają zielonych statusów `check` i `webkit`.

Przed zmianą Production code/environment/Sheet contract uruchamiany jest także Production gate obejmujący `prod:env:validate`, `sheet:validate` i `diagnostics`.

## TEST / Preview

Canonical Preview używa osobnego TEST Sheet i TEST service account. Nie może korzystać z produkcyjnego arkusza ani produkcyjnej identity.

Po bezpośrednim hotfixie Production `preview` musi zostać zsynchronizowany z aktualnym `main`, zanim ponownie stanie się kanonicznym stagingiem.

## Dokumentacja

Najważniejsze źródła prawdy:

- `docs/IMPLEMENTATION_STATUS.md`
- `docs/RELEASE_CHECKLIST.md`
- `docs/DEPLOYMENT.md`
- `docs/OPERATIONS.md`
- `docs/NOTIFICATION_OUTBOX.md`
- `docs/OFFER_CATALOG_2026-2027.md`
- `docs/AUDIT_REMEDIATION_2026-08-30.md`

Długoterminowe zmiany architektury po launchu, w tym migracja transactional core z Google Sheets do PostgreSQL, pozostają opisane w remediation planie i nie są udawane jako rozwiązane przez launch hotfix.

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
- `main` i `preview` pozostają chronione aktywnym rulesetem i wymagają PR + zielonego CI.

## Licencja

Kod jest publicznie widoczny, ale nie jest udostępniany na licencji open source. Obowiązują warunki `LICENSE` oraz zasady contribution opisane w `CONTRIBUTING.md`.
