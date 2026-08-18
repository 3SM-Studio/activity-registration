# Operations

## Diagnostics

```bash
pnpm diagnostics
```

Dla Google sprawdza schema i liczbę pozycji katalogu bez wypisywania PII.

## Reconciliation

```bash
pnpm registrations:reconcile
```

Jest read-only i raportuje:

- duplicate REQUEST_ID,
- duplicate REGISTRATION_ID,
- rekordy bez technicznych ID.

Nie usuwa danych automatycznie.

## Fresh TEST Sheet

```bash
APP_ENV=test DATA_BACKEND=google-sheets pnpm sheet:bootstrap
APP_ENV=test DATA_BACKEND=google-sheets ALLOW_TEST_SEED=true pnpm seed:test
pnpm sheet:validate
```

`seed:test` nie czyści arkusza `ZAPISY`.

## Schema migrations

`SYSTEM_SCHEMA_VERSION` w `USTAWIENIA` jest źródłem wersji schematu arkusza.

```bash
pnpm sheet:migrate
```

Aktualnie istnieje wyłącznie schema v1, więc komenda jest bezpiecznym no-op dla v1 i failuje dla nieznanej starszej lub nowszej wersji zamiast modyfikować dane na ślepo.

## Ambiguous writes

`values.append` nie jest automatycznie retryowane wewnątrz klienta Google. Jeśli wynik zapisu jest niepewny, retry całego zgłoszenia używa tego samego `requestId`; backend najpierw odczytuje istniejący rekord, a dopiero potem ewentualnie wykonuje kolejny append. Dzięki temu retry transportowy nie omija warstwy idempotencji.
