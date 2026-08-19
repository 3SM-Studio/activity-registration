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
10. Po skutecznym persistence v1 wysyła best-effort potwierdzenie do osoby zapisującej i powiadomienie administracyjne przez Resend. Błąd e-maila nie cofa zapisu. Transportowy replay tego samego `requestId` nie wysyła wiadomości ponownie. Trwały outbox/reconciliation pozostaje hardeningiem opisanym w issue #3.
11. TEST i PROD mają osobne arkusze oraz osobne identity/access.
12. Vercel używa OIDC + Google Workload Identity Federation. Preview i Production mają osobne principals.
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
23. Cel accessibility: WCAG 2.2 AA. CI sprawdza podstawowe zachowanie dostępności i viewporty mobilne, a przed PROD wymagany jest ręczny smoke test klawiatury, focusu i kontrastu.
24. Język MVP: polski.
25. Publiczne miasta bez żadnej aktywnej publicznej oferty nie są pokazywane.
26. City i offering IDs spełniają kontrakt `[a-z0-9][a-z0-9_-]{0,99}`.
27. Placeholder informacji o prywatności jest dostępny tylko poza PROD.
28. Repozytorium `3SM-Studio/activity-registration` jest świadomie publiczne. Publiczność repo nie zmienia modelu sekretów: credentials, tokeny, PII i lokalne env nie mogą trafić do Git. `.env*` pozostaje ignorowane z wyjątkiem jawnie bezsekretowego `.env.example`.
29. `docs/PROJECT_BLUEPRINT.md` jest bazowym planem przedimplementacyjnym. Późniejsze jawne decyzje w tym pliku oraz zweryfikowany stan w `docs/IMPLEMENTATION_STATUS.md` zastępują sprzeczne założenia blueprintu, w szczególności wcześniejsze założenie prywatnego repo i brak maili w v1.
30. Techniczne kolumny `ZAPISY` dostają bootstrapowaną ochronę ostrzegawczą Google Sheets. `STATUS` i `NOTES` pozostają operacyjne. Twarda integralność nadal wynika z uprawnień do arkusza, walidacji backendu i kontrolowanego write path, ponieważ warning-only protection ma chronić przede wszystkim przed przypadkową ręczną edycją.

## Engineering baseline, 2026-08-19

- Runtime: Node.js 24.19.0 LTS.
- Package manager: pnpm 11.20.0.
- Dependencies są exact-pinned i przypięte przez `pnpm-lock.yaml`.
- TypeScript 6.0.3 i ESLint 9.39.5 są świadomymi compatibility pins.
- `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` i `noImplicitOverride` są aktywne.
- Vercel Preview używa zweryfikowanego OIDC -> Google WIF -> TEST service account flow.
- Preview E2E z realnym TEST Sheet read/write oraz Resend został zweryfikowany 2026-08-19.
- `pnpm check` oraz krytyczne E2E Playwright są wymagane przed merge i production readiness.
- Osobny real-Google integration test jest uruchamiany jawnie wyłącznie na TEST i nie jest częścią zwykłego CI.
