# Operations

## Diagnostics

```bash
APP_ENV=test DATA_BACKEND=google-sheets pnpm diagnostics
```

Dla Google sprawdza schema, katalog, ustawienia i protection metadata bez wypisywania PII.

## Reconciliation

```bash
APP_ENV=test DATA_BACKEND=google-sheets pnpm registrations:reconcile
```

Jest read-only i raportuje:

- duplicate REQUEST_ID,
- duplicate REGISTRATION_ID,
- rekordy bez technicznych ID,
- niespójne snapshoty.

Nie usuwa danych automatycznie.

## Fresh TEST Sheet

```bash
APP_ENV=test DATA_BACKEND=google-sheets pnpm sheet:bootstrap
APP_ENV=test DATA_BACKEND=google-sheets ALLOW_TEST_SEED=true pnpm seed:test
APP_ENV=test DATA_BACKEND=google-sheets pnpm sheet:validate
```

`sheet:bootstrap` jest niedestrukcyjny. Oprócz struktury i zamrożenia headerów zakłada warning-only protections na technicznych kolumnach `ZAPISY`, pozostawiając `STATUS` i `NOTES` jako kolumny operacyjne.

`seed:test` nie czyści arkusza `ZAPISY`.

## Real Google Sheets integration smoke

Jawny test roundtrip wykonujemy tylko na TEST:

```bash
APP_ENV=test \
DATA_BACKEND=google-sheets \
ALLOW_TEST_SEED=true \
pnpm test:integration:sheets
```

Test:

1. waliduje strukturę,
2. pobiera aktywną ofertę TEST,
3. zapisuje syntetyczny Registration,
4. odczytuje go po `requestId`,
5. sprawdza kluczowe pola,
6. czyści własny testowy wiersz w `finally`.

Komenda jest twardo blokowana dla środowiska innego niż `APP_ENV=test` i wymaga jawnego `ALLOW_TEST_SEED=true`.

## Schema migrations

`SYSTEM_SCHEMA_VERSION` w `USTAWIENIA` jest źródłem wersji schematu arkusza.

```bash
pnpm sheet:migrate
```

Aktualnie istnieje wyłącznie schema v1, więc komenda jest bezpiecznym no-op dla v1 i failuje dla nieznanej starszej lub nowszej wersji zamiast modyfikować dane na ślepo.

## Ambiguous writes

`values.append` nie jest automatycznie retryowane wewnątrz klienta Google. Jeśli wynik zapisu jest niepewny, retry całego zgłoszenia używa tego samego `requestId`; backend najpierw odczytuje istniejący rekord, a dopiero potem ewentualnie wykonuje kolejny append. Dzięki temu retry transportowy nie omija warstwy idempotencji.

## PROD operating rule

Przed produkcyjnym smoke testem:

- `REGISTRATIONS_OPEN=FALSE`,
- osobny PROD service account,
- PROD Sheet dostępny dla PROD identity, nie TEST identity,
- komplet privacy configuration,
- komplet Vercel Production env,
- `sheet:validate` i `diagnostics` bez blockerów.

`REGISTRATIONS_OPEN=TRUE` jest ostatnią operacją po przejściu całej release checklist.
