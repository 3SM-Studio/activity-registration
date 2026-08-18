# Testing

## Unit

- Zod validation,
- minor/adult,
- phone normalization,
- header mapping,
- schema errors,
- submit snapshots,
- request retry idempotency,
- requestId conflict,
- privacy production gate,
- unavailable offering.

## E2E

Playwright sprawdza:

1. disabled Zajęcia przed wyborem miasta,
2. filtrowanie Gdynia/Sopot,
3. pełny zapis osoby niepełnoletniej,
4. zmianę miasta i reset zajęć,
5. przejście minor -> adult.

## Commands

```bash
pnpm test:run
pnpm test:e2e
pnpm check
```

Integracja z realnym Google Sheet jest wykonywana jawnie na TEST, nie w zwykłym unit CI.
