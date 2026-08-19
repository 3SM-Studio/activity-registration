# Testing

## Unit

Unit tests obejmują co najmniej:

- Zod validation,
- minor/adult guardian rules,
- czyszczenie guardian data dla adult,
- phone normalization,
- header mapping,
- schema errors,
- submit snapshots,
- request retry idempotency,
- requestId conflict,
- business duplicate allowed przy innym requestId,
- privacy production gate,
- unavailable offering,
- Google Sheets RAW append i brak retry dla niejednoznacznego append,
- Resend request contract,
- participant/admin notification planning,
- env validation dla Preview i Production WIF.

## Playwright E2E

`pnpm test:e2e` uruchamia krytyczne scenariusze na kilku profilach Chromium:

- desktop,
- mobile boundary 320 px,
- mobile boundary 430 px.

Scenariusze obejmują:

1. disabled Zajęcia przed wyborem miasta,
2. filtrowanie ofert po mieście,
3. pełny zapis osoby niepełnoletniej,
4. zmianę miasta i reset zajęć,
5. przejście minor -> adult,
6. stale offering rejected przez backend i reset pola,
7. temporary failure + retry z tym samym `requestId`,
8. focus na pierwszym błędnym polu po niepoprawnym submit,
9. brak poziomego overflow publicznego formularza w testowanych viewportach.

E2E w CI używa `DATA_BACKEND=memory`, więc nie dotyka Google Sheets ani realnych danych.

## Real Google Sheets integration

Jawny test integracyjny:

```bash
APP_ENV=test \
DATA_BACKEND=google-sheets \
ALLOW_TEST_SEED=true \
pnpm test:integration:sheets
```

Zasady:

- działa wyłącznie przy `APP_ENV=test`,
- nigdy nie może wykonać zapisu przy `APP_ENV=production`,
- wymaga jawnego `ALLOW_TEST_SEED=true`,
- używa wyłącznie syntetycznych danych,
- waliduje schema TEST,
- zapisuje syntetyczny Registration,
- odczytuje go przez repository adapter,
- sprawdza mapowanie kluczowych pól,
- czyści własny testowy wiersz po zakończeniu.

Ten test jest operacyjny i jawny, nie jest częścią zwykłego GitHub Actions CI, ponieważ wymaga dostępu do realnego TEST Sheet i Google credentials.

## Accessibility

Celem jest WCAG 2.2 AA. Automatyczne testy pokrywają podstawowe regresje zachowania, ale nie zastępują ręcznego audytu.

Przed PROD wykonujemy ręcznie:

- pełny flow tylko klawiaturą,
- kolejność focusu,
- widoczność focus ringów,
- focus po błędnym submit,
- zoom/reflow,
- kontrast tekstu i interaktywnych stanów,
- czytelność błędów bez polegania wyłącznie na kolorze,
- smoke test na realnym telefonie.

## Commands

```bash
pnpm test:run
pnpm test:e2e
pnpm check
```

Real Google TEST:

```bash
APP_ENV=test DATA_BACKEND=google-sheets pnpm sheet:validate
APP_ENV=test DATA_BACKEND=google-sheets pnpm diagnostics
APP_ENV=test DATA_BACKEND=google-sheets ALLOW_TEST_SEED=true pnpm test:integration:sheets
```
