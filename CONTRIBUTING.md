# Contributing

To repozytorium jest publiczne i przyjmuje sensowne propozycje zmian przez Pull Request.

## Model pracy

- `main` jest branchem release/Production.
- Normalne zmiany powstają na osobnym branchu lub forku i trafiają do `main` przez Pull Request.
- Maintainer może samodzielnie zatwierdzać i mergować zmiany po przejściu quality gate.
- Zewnętrzny contributor nie potrzebuje bezpośredniego write access do `main`.
- Preferowany merge po zamknięciu review to squash, jeden logiczny PR = jeden logiczny commit na `main`.
- Bezpośredni push do `main` jest zarezerwowany wyłącznie dla pilnego hotfixu bezpieczeństwa/produkcji, po którym należy odtworzyć normalny stan CI i udokumentować przyczynę.

## Przed PR

Wymagane lokalnie:

```bash
pnpm install --frozen-lockfile
pnpm check
```

Jeżeli zmiana wpływa na formularz, routing, API albo zachowanie w przeglądarce:

```bash
pnpm test:e2e
```

Dla integracji z realnym Google Sheets używaj wyłącznie TEST i jawnej flagi zapisu opisanej w `README.md` oraz `docs/TESTING.md`.

## Zasady bezpieczeństwa

Nie commituj:

- sekretów, tokenów, API keys i credentials,
- plików `.env` poza bezsekretowym `.env.example`,
- private key service account,
- realnych danych osobowych w testach, fixture'ach, screenshotach i logach,
- danych z PROD Sheet.

Jeżeli sekret trafił do historii Git, samo usunięcie pliku nie wystarcza. Traktuj sekret jako ujawniony i rotuj go.

## Zakres PR

PR powinien rozwiązywać jeden spójny problem. Duże zmiany rozbijaj, gdy można je niezależnie zweryfikować i bezpiecznie wdrożyć.

Zmiana zachowania systemu powinna aktualizować odpowiedni source of truth, w szczególności `docs/DECISIONS.md`, `docs/IMPLEMENTATION_STATUS.md`, `docs/OPERATIONS.md` lub `docs/RELEASE_CHECKLIST.md`.

## Production

Zmiana nie może otworzyć Production przez przypadek. Jeśli PROD nie ma kompletnej konfiguracji, aplikacja ma pozostać fail-closed.

Otwarcie zapisów produkcyjnych wymaga przejścia aktualnego `docs/RELEASE_CHECKLIST.md` i nie może wykorzystywać syntetycznego katalogu TEST ani TEST identity.
