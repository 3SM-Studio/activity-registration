# Contributing

To repozytorium jest publiczne i przyjmuje sensowne propozycje zmian przez Pull Request, ale publiczna widoczność kodu nie oznacza licencji open source. Zasady używania kodu opisuje `LICENSE`.

## Model pracy

- `main` jest branchem release/Production.
- `preview` jest stałym branchem integracyjnym i źródłem pełnego Vercel Preview TEST.
- Normalne zmiany powstają na osobnym branchu lub forku i trafiają Pull Requestem do `preview`.
- Po zielonym CI i realnej weryfikacji na Preview `preview` jest promowany osobnym Pull Requestem do `main`.
- Maintainer może samodzielnie zatwierdzać i mergować zmiany po przejściu quality gate.
- Zewnętrzny contributor nie potrzebuje bezpośredniego write access do `main` ani `preview`.
- Preferowany merge po zamknięciu review to squash, jeden logiczny PR = jeden logiczny commit na branchu docelowym.
- Bezpośredni push do `main` lub `preview` jest zarezerwowany wyłącznie dla pilnego hotfixu bezpieczeństwa/produkcji, po którym należy odtworzyć normalny stan CI i udokumentować przyczynę.

## Prawa do zewnętrznych contribution

Samo otwarcie Pull Requesta nie przenosi praw autorskich i nie zmienia warunków `LICENSE`.

Kod od osoby spoza aktualnego zespołu nie powinien zostać zmergowany, dopóki maintainer i autor nie mają jawnie udokumentowanego prawa pozwalającego projektowi używać, modyfikować i utrzymywać daną zmianę. Dzięki temu publiczny PR może służyć do review lub propozycji bez automatycznego tworzenia niejasności dotyczących praw do kodu.

Nie kopiuj do PR kodu, assetów lub treści, do których nie masz odpowiednich praw.

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
