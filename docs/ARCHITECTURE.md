# Architecture

## Layers

```text
src/domain
  Pure business types and rules

src/application
  Use cases and stable application errors

src/infrastructure
  Google Sheets and memory adapters

src/app
  Next.js transport and UI
```

## Dependency direction

Domena nie importuje:

- Next.js,
- React,
- Google APIs,
- Vercel.

Application layer zależy od interfejsów repozytoriów, nie od implementacji Google.

## Submit flow

```text
parse + validate
-> normalize
-> requestId lookup
-> idempotent replay check
-> current settings
-> current catalog
-> city/offering integrity
-> snapshot names
-> create registration
-> repository create
-> success
```

Jeżeli retry przychodzi z tym samym `requestId`, ale innym logicznym payloadem, system zwraca `REQUEST_ID_CONFLICT`.

## Concurrency boundary

Google Sheets nie daje constraintu `UNIQUE` ani transakcji jak SQL. MVP nie obiecuje matematycznego exactly-once.

Jeżeli wymagania obejmą ostatnie wolne miejsce, atomowy capacity counter albo twardą unikalność, zapis transakcyjny musi przejść do bazy wspierającej transakcje i constrainty.

## Ambiguous writes

`values.append` nie jest automatycznie retryowane wewnątrz klienta Google. Jeśli wynik zapisu jest niepewny, retry całego zgłoszenia używa tego samego `requestId`; backend najpierw odczytuje istniejący rekord, a dopiero potem ewentualnie wykonuje kolejny append. Dzięki temu retry transportowy nie omija warstwy idempotencji.
