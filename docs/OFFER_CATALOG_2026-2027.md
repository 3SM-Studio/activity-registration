# Oferta Pozytywki 2026/2027

Date: 2026-08-29
Status: canonical catalog input for the current offer refresh

Ten dokument zastępuje wcześniejszy roboczy katalog sześciu ogólnych ofert i ośmiu grup z `docs/PRODUCTION_DECISIONS_2026-08-20.md` w zakresie nazw zajęć, lokalizacji, wieku, terminów i cen.

## Kontrakt produktu

Publiczny użytkownik wybiera teraz konkretną ofertę, np. `AcroDance · 5-8 lat · początkująca`, a nie szeroką kategorię `Taniec i akrobatyka`.

Wysłanie formularza nadal jest wyłącznie zgłoszeniem. Nie rezerwuje automatycznie miejsca, nie zawiera umowy i nie pobiera płatności. Pozytywka weryfikuje możliwość przyjęcia i dopiero potem potwierdza udział albo proponuje dalsze kroki.

## Aktywne miejsca i oferty

### Olkusz · Klub Przyjaźń

1. Psikusy, 4-6 lat, poniedziałki 16:15-17:15, 160 zł / miesiąc.
2. Psotki, dzieci 7+, wtorki 16:15-18:15, 230 zł / miesiąc.
3. Szkółka Baletu Pozytywka · Piruet, dzieci 4+, poniedziałki 17:15-18:15, 160 zł / miesiąc.
4. Zespół wokalny, dzieci 10+, poniedziałki od 18:30, 160 zł / miesiąc.
5. StepDance, dorośli, poniedziałki od 18:15, cena nie została podana w źródle wejściowym.
6. AcroDance, grupa początkująca 5-8 lat, wtorki od 16:15, 180 zł / miesiąc.
7. AcroDance, grupa zaawansowana dla dzieci 9+, wtorki od 17:15, 180 zł / miesiąc.
8. Teatr pod Czarnym Kotem, dziecięcy teatr muzyczny, wtorki 17:15-19:15, opłata 240 zł. Częstotliwość opłaty nie została dopisana.
9. Pląsanie, dzieci do 4 lat z opiekunem, poniedziałki od 17:30, 50 zł / zajęcia.

### Bukowno · MOK Bukowno

1. Psikusy, 4-6 lat, czwartki 16:45-17:45, 160 zł / miesiąc.
2. Psotki, dzieci 7+, czwartki 15:45-17:45, 230 zł / miesiąc.
3. Inside, grupa początkująca 5-8 lat, środy od 15:15, 160 zł / miesiąc.
4. Inside, grupa zaawansowana dla dzieci 9+, czwartki od 17:45, 160 zł / miesiąc.
5. Szkółka Baletu Pozytywka · Arabeska, dzieci 4+, czwartki 15:45-16:45, 160 zł / miesiąc.
6. Teatr dziecięcy Bez Kurtyny, czwartki 17:45-19:15, opłata 200 zł. Częstotliwość opłaty nie została dopisana.
7. SynTeza · Street Dance Squad, 9-12 lat, środy 16:15-17:15 i czwartki 18:45-19:45, 250 zł / miesiąc.
8. Babeczki · dzikie pląsy, poniedziałki od 18:45, 50 zł / zajęcia lub karnet miesięczny 160 zł. Wiek grupy nie został podany.

### Bolesław · Centrum Kultury

1. SynTeza · Street Dance Kids, 6-9 lat, środy 18:00-19:00, 160 zł / miesiąc.

## Zasady technicznego odwzorowania wieku

System nadal musi mieć zakres wieku w `GRUPY`, ponieważ serwer używa go do walidacji zgłoszenia.

Przyjęte bezpieczne odwzorowanie bieżącego tekstu oferty:

- dokładne zakresy, np. `4-6`, `5-8`, `9-12`, są zapisane dokładnie,
- `dla dzieci 7+`, `9+`, `10+` oraz `dzieci 4+` są ograniczone technicznie do 17 lat, ponieważ tekst jawnie mówi o dzieciach,
- `StepDance dla dorosłych` ma minimum 18 lat,
- `Teatr pod Czarnym Kotem` i `Bez Kurtyny` mają szeroki zakres 0-17, ponieważ nie podano dokładniejszego wieku; jest to tylko child-only guard, nie deklaracja realnego minimum,
- `Pląsanie do 4 lat` jest obecnie interpretowane jako 0-4 włącznie,
- `Babeczki` pozostają bez technicznego ograniczenia wieku, bo źródło go nie podaje.

Te punkty należy skorygować w katalogu, jeśli Pozytywka poda dokładniejsze granice. Nie należy zgadywać bardziej szczegółowych zakresów.

## Brakujące dane pozostawione puste

Nie przenosimy wcześniejszych roboczych danych, których nowa oferta nie potwierdza:

- pojemności grup,
- prowadzących,
- godziny zakończenia tam, gdzie podano tylko godzinę startu,
- ceny StepDance,
- dokładnego wieku dwóch teatrów,
- wieku grupy Babeczki.

## SynTeza Street Dance Squad

To jedna oferta i jedna grupa mająca dwa spotkania tygodniowo. Obecny schema v4 ma pojedyncze pola `DAY_OF_WEEK`, `START_TIME`, `END_TIME`, dlatego pełny harmonogram jest zapisany w `DAY_OF_WEEK` jako tekst `Śr 16:15-17:15 + czw 18:45-19:45`, a pola czasu pozostają puste.

Nie tworzymy dwóch sztucznych grup, ponieważ byłoby to biznesowo nieprawdziwe. Jeżeli w przyszłości harmonogram ma być używany do automatyki kalendarza lub kolizji sal, należy wydzielić osobną encję terminów.

## Bezpieczne wdrożenie istniejącego arkusza

Produkcja ma już historię `ZAPISY`, więc jednorazowy seed nie jest właściwą ścieżką. Używamy idempotentnego refreshu katalogu:

```bash
APP_ENV=test DATA_BACKEND=google-sheets ALLOW_POZYTYWKA_OFFER_REFRESH=true pnpm catalog:refresh:2026-2027
```

Po pełnym QA na TEST:

```bash
APP_ENV=production DATA_BACKEND=google-sheets ALLOW_POZYTYWKA_OFFER_REFRESH=true pnpm catalog:refresh:2026-2027
```

Refresh:

- wymaga zamkniętych zapisów,
- nie modyfikuje `ZAPISY` ani `POWIADOMIENIA`,
- zachowuje stare rekordy katalogowe, ale oznacza je jako nieaktywne,
- ustawia dokładnie 3 aktywne miejsca, 18 aktywnych ofert i odpowiadające im grupy,
- w Production wymaga sezonu `2026-2027` i dokładnego produkcyjnego Spreadsheet ID.

Po operacji obowiązkowo uruchomić `sheet:validate`, `diagnostics`, test formularza na Preview i ręczną kontrolę katalogu przed zmianą `REGISTRATIONS_OPEN`.
