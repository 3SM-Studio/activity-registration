# Repository policy

Ten plik opisuje docelowy model governance dla publicznego `3SM-Studio/activity-registration` prowadzonego głównie przez jednego maintainera.

## Branching i merge

- `main` jest jedynym branchem release i źródłem Vercel Production.
- Normalne zmiany trafiają do `main` przez Pull Request.
- Required approvals: `0`. Solo maintainer nie powinien wymagać własnego approval do merge.
- Wymagany status check: job `check` z workflow `CI`.
- Branch PR powinien być aktualny względem `main` przed merge.
- Wszystkie nierozwiązane review conversations powinny blokować merge.
- Force push i usuwanie `main` powinny być zablokowane.
- Preferowany i docelowo jedyny standardowy merge method: squash.
- Branch po merge może być automatycznie usuwany.
- Auto-merge może być włączony, ale wyłącznie po spełnieniu wymaganych checks.

## Bypass

Admin bypass jest awaryjny, nie codzienny. Dopuszczalny przypadek to pilny hotfix bezpieczeństwa/produkcji, gdy oczekiwanie na zwykły PR utrzymuje aktywny incydent.

Po bypassie trzeba:

1. przywrócić bezpieczny stan Production,
2. uruchomić pełne CI,
3. przenieść hotfix do aktywnych branchy/PR,
4. zostawić czytelny ślad w historii lub PR.

## Public contributions

Repo jest publiczne. Osoby zewnętrzne mogą forkować repo i otwierać Pull Requesty. Nie potrzebują bezpośredniego write access do `main`.

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

## Production invariant

Merge do `main` nie może sam z siebie oznaczać otwarcia zapisów. Brak kompletnej jawnej konfiguracji PROD musi kończyć się stanem fail-closed.

TEST katalog, TEST Sheet i TEST identity nigdy nie mogą być użyte jako fallback Production.
