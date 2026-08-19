# Repository policy

Ten plik opisuje docelowy model governance dla publicznego `3SM-Studio/activity-registration` prowadzonego głównie przez jednego maintainera.

## Branching i merge

- `main` jest jedynym branchem release i źródłem Vercel Production.
- `preview` jest stałym branchem integracyjnym i jedynym źródłem pełnego Vercel Preview TEST.
- Normalne zmiany zaczynają się na krótkotrwałym branchu i trafiają Pull Requestem do `preview`.
- Po zielonym CI i realnym smoke/E2E na stałym Preview, `preview` jest promowany Pull Requestem do `main`.
- Required approvals: `0`. Solo maintainer nie powinien wymagać własnego approval do merge.
- Wymagany status check: job `check` z workflow `CI`.
- Branch PR powinien być aktualny względem branchu docelowego przed merge.
- Wszystkie nierozwiązane review conversations powinny blokować merge.
- Force push i usuwanie `main` oraz `preview` powinny być zablokowane.
- Preferowany i docelowo jedyny standardowy merge method: squash dla feature PR-ów.
- Branch po merge może być automatycznie usuwany, z wyjątkiem stałego `preview`.
- Auto-merge może być włączony, ale wyłącznie po spełnieniu wymaganych checks.

Docelowy przepływ:

```text
feature/*
-> PR do preview
-> CI
-> merge do preview
-> Vercel Preview TEST
-> realny smoke/E2E
-> PR preview -> main
-> CI
-> merge do main
-> Vercel Production
```

## Bypass

Admin bypass jest awaryjny, nie codzienny. Dopuszczalny przypadek to pilny hotfix bezpieczeństwa/produkcji, gdy oczekiwanie na zwykły PR utrzymuje aktywny incydent.

Po bypassie trzeba:

1. przywrócić bezpieczny stan Production,
2. uruchomić pełne CI,
3. zsynchronizować hotfix z `preview`,
4. zostawić czytelny ślad w historii lub PR.

## Public contributions

Repo jest publiczne. Osoby zewnętrzne mogą forkować repo i otwierać Pull Requesty. Nie potrzebują bezpośredniego write access do `main` ani `preview`.

`CODEOWNERS` wskazuje maintainer ownership, ale przy solo-development nie oznacza to obowiązkowego self-approval.

## Security baseline

Docelowo w ustawieniach GitHub powinny być włączone, o ile są dostępne dla repo/organizacji:

- Dependabot alerts,
- Dependabot security updates,
- secret scanning,
- push protection,
- CodeQL code scanning w default setup.

`SECURITY.md` jest publicznym kontraktem zgłaszania podatności.

## Merge settings

Docelowy stan repozytorium:

- Public: ON
- Default branch: `main`
- Squash merge: ON
- Merge commits: OFF dla zwykłych zmian
- Rebase merge: OFF dla zwykłych zmian
- Auto-merge: ON
- Automatically delete head branches: ON
- Update branch: ON

## Preview invariant

Tylko Vercel deployment pochodzący z branchu `preview`, z pełną konfiguracją TEST, może przyjmować testowe zgłoszenia.

Inne Vercel Preview deploymenty muszą działać fail-closed. Nie mogą używać `memory` jako cichego fallbacku i zwracać sukcesu dla nietrwałego zapisu.

## Production invariant

Merge do `main` nie może sam z siebie oznaczać otwarcia zapisów. Brak kompletnej jawnej konfiguracji PROD musi kończyć się stanem fail-closed.

TEST katalog, TEST Sheet i TEST identity nigdy nie mogą być użyte jako fallback Production.
