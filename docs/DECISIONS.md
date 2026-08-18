# Decisions

## Accepted for MVP

1. Publiczny frontend i API: Next.js App Router.
2. Storage v1: Google Sheets przez repository adapters.
3. Jedno zgłoszenie to jeden uczestnik na jedną konkretną ofertę.
4. Kilka ofert oznacza kilka niezależnych zgłoszeń.
5. `requestId` chroni retry transportowy i double submit.
6. Nie blokujemy biznesowych duplikatów po imieniu, telefonie ani e-mailu.
7. Model MVP ma `ClassOffering`, bez przedwczesnego `Class`.
8. Wiek jest integerem, nie zbieramy daty urodzenia bez potrzeby.
9. Dla osoby niepełnoletniej dane kontaktowe dotyczą opiekuna.
10. v1 nie wysyła maili.
11. TEST i PROD mają osobne arkusze oraz osobne identity/access.
12. Produkcja na Vercelu używa OIDC + Workload Identity Federation.
13. Nie przechowujemy produkcyjnego JSON private key.
14. Wartości formularza trafiają do Sheets przez `valueInputOption=RAW`.
15. Adapter mapuje kolumny po nazwach nagłówków, nie po stałych indeksach.
16. Systemowe arkusze mają dokładny kontrakt nagłówków. Dodatkowa kolumna wymaga jawnej migracji.
17. `sheet:bootstrap` jest niedestrukcyjny, `sheet:validate` read-only, a `sheet:migrate` jest jawny.
18. `SYSTEM_SCHEMA_VERSION` jest źródłem prawdy dla wersji struktury arkusza.
19. Nie wykonujemy automatycznego retry operacji `append` ani potencjalnie nieidempotentnego `batchUpdate`.
20. Niejednoznaczny błąd zapisu wraca do klienta, a kolejna próba z tym samym `requestId` najpierw wykonuje reconciliation przez odczyt.
21. Privacy notice i retencja są release gate dla PROD.
22. Twarde limity miejsc lub wymaganie transakcji uruchamiają review storage.
23. Cel accessibility: WCAG 2.2 AA.
24. Język MVP: polski.
25. Publiczne miasta bez żadnej aktywnej publicznej oferty nie są pokazywane.
26. City i offering IDs spełniają kontrakt `[a-z0-9][a-z0-9_-]{0,99}`.
27. Placeholder informacji o prywatności jest dostępny tylko poza PROD.

## Engineering baseline, 2026-08-18

- Runtime: Node.js 24.19.0 LTS.
- Package manager: pnpm 11.20.0.
- Dependencies są exact-pinned i opisane w `docs/DEPENDENCIES.md`.
- TypeScript 6.0.3 i ESLint 9.39.5 są świadomymi compatibility pins.
- Produkcyjny Google auth używa Vercel OIDC + Google Workload Identity Federation.
- `pnpm-lock.yaml` jest wymagany przed merge i release.
- `pnpm check` oraz krytyczne E2E są wymagane przed production readiness.
