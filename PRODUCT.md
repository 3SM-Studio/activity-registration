# PRODUCT.md

## Product

Publiczny system przyjmowania zgłoszeń na zajęcia Pracowni Twórczej Pozytywka.

To nie jest automatyczny system rezerwacji miejsca i nie jest to checkout. Użytkownik wybiera miasto oraz publiczny rodzaj zajęć, podaje dane uczestnika i kontakt, a następnie wysyła zgłoszenie do weryfikacji.

Po wysłaniu Pozytywka, obecnie operacyjnie Iwona Pilarz, sprawdza zgłoszenie, dobiera odpowiednią wewnętrzną grupę i termin, kontaktuje się z rodzicem/opiekunem albo dorosłym uczestnikiem i dopiero wtedy potwierdza udział, przenosi zgłoszenie na listę rezerwową, odrzuca je albo zamyka z innego powodu.

Ta różnica jest podstawowym kontraktem produktu.

## Audience

Główni użytkownicy:

- rodzice zapisujący dzieci na zajęcia, najczęściej z telefonu,
- młodzież i dorośli zapisujący siebie,
- osoby, które trafiają do formularza bez znajomości wewnętrznej struktury grup Pozytywki.

Użytkownik może być w pośpiechu, korzystać jedną ręką z telefonu i nie znać nazw grup ani grafiku wewnętrznego. Nie powinien być zmuszany do wyboru konkretnej grupy, jeśli zgodnie z procesem robi to później Pozytywka.

## Public choice vs internal assignment

Publiczny użytkownik wybiera ofertę, np.:

```text
Gdynia -> Hip-hop
```

Nie wybiera w v3 finalnej grupy typu:

```text
Hip-hop 10-12 lat, środa 17:30
```

Taka grupa jest wewnętrzną decyzją Pozytywki po weryfikacji zgłoszenia.

## Purpose

Najważniejszy rezultat: poprawnie wysłane zgłoszenie bez niepewności, co należy zrobić dalej i bez błędnego wrażenia, że miejsce zostało już potwierdzone.

Formularz powinien:

- szybko pokazać, że użytkownik jest w zapisach Pozytywki,
- pomóc wybrać miasto i publiczny rodzaj zajęć,
- zebrać tylko dane potrzebne do obsługi zgłoszenia,
- użyć dokładnej daty urodzenia do wyliczenia wieku i wsparcia późniejszego dopasowania do grupy wiekowej,
- pokazać dane opiekuna tylko dla osoby niepełnoletniej,
- zachować wpisane dane przy błędach,
- jasno komunikować powodzenie, błąd, zamknięcie zapisów i listę rezerwową,
- jasno powiedzieć, że Pozytywka po weryfikacji skontaktuje się z użytkownikiem i dopiero wtedy ustali grupę oraz termin.

## Registration lifecycle

Docelowy v3 workflow zgłoszenia:

```text
NEW
-> IN_REVIEW
-> CONTACTED
-> WAITLISTED / CONFIRMED / REJECTED / CANCELLED
```

`CONFIRMED` oznacza, że Pozytywka zakończyła weryfikację i kontakt oraz potwierdziła konkretną możliwość uczestnictwa.

Ta aplikacja nie zarządza późniejszą frekwencją ani rezygnacją uczestnika z już trwających zajęć.

## Offering modes

System musi obsługiwać przynajmniej dwa modele biznesowe bez hardcodowania nazw zajęć:

- `ROLLING`, typowe zajęcia, na które zwykle można zgłaszać się w trakcie sezonu,
- `WINDOWED`, projekt/zajęcia z określonym oknem zapisów, np. produkcja teatralna.

Dodatkowo oferta może mieć stan przyjmowania zgłoszeń:

```text
OPEN
WAITLIST_ONLY
CLOSED
```

Szczegółowe zasady teatru, ceny, płatności i rezygnacji pozostają niezatwierdzone i nie mogą być wymyślane w kodzie.

## Season

Zgłoszenie musi mieć kontekst sezonu, np. `2026/2027`, nawet jeśli użytkownik nie wybiera go ręcznie.

Sezon jest potrzebny do:

- historycznego znaczenia zgłoszenia,
- deduplikacji biznesowej,
- raportowania,
- przypisywania wewnętrznej grupy.

## Duplicate policy

`requestId` nadal chroni retry techniczny i double-submit tej samej próby.

v3 dodaje osobny mechanizm biznesowej deduplikacji:

- dokładny aktywny duplikat tego samego uczestnika, oferty, miasta i sezonu z tym samym kontaktem nie tworzy nowego rekordu,
- prawdopodobny duplikat z innym telefonem lub e-mailem nie jest blokowany, ale jest oznaczany dla Iwony,
- ten sam uczestnik na inne zajęcia albo w kolejnym sezonie to prawidłowe nowe zgłoszenie.

## Brand context

Pozytywka działa w obszarze edukacji artystycznej, teatru muzycznego, śpiewu, tańca i ruchu scenicznego. W publicznych materiałach pojawiają się dziecięce i młodzieżowe grupy wokalne, wokalno-taneczne, teatr, balet i projekty sceniczne.

Marka nie powinna być sprowadzona do estetyki przedszkola. Jej charakter obejmuje również starsze dzieci i młodzież, scenę, emocje, współpracę zespołową i ambitniejsze projekty artystyczne.

## Voice

**Ciepła. Twórcza. Pewna. Konkretna.**

Teksty powinny być krótkie, ludzkie i jednoznaczne. Bez urzędowego języka, marketingowego nadęcia i infantylizowania rodziców, dzieci ani młodzieży.

Dobre przykłady:

- „Wybierz miasto i zajęcia.”
- „Data urodzenia pomaga nam dobrać odpowiednią grupę wiekową.”
- „Po wysłaniu sprawdzimy zgłoszenie i skontaktujemy się z Tobą, żeby ustalić odpowiednią grupę i termin.”
- „Samo wysłanie formularza nie oznacza jeszcze potwierdzenia miejsca.”
- „Twoje dane zostały w formularzu. Spróbuj ponownie.”

## Register

Domyślnie: **product**.

Brand może być bardziej ekspresyjny w nagłówku strony, tle, kolorze i mikrodetalach. Sam formularz ma pozostać spokojny, czytelny i przewidywalny.

## Constraints

- mobile-first,
- bardzo dobra obsługa szerokości około 320-430 px,
- WCAG 2.2 AA,
- pola dotykowe minimum 44 px,
- brak informacji przekazywanej wyłącznie kolorem,
- brak hover-only interactions,
- brak modali w podstawowym flow,
- brak ciężkich animacji,
- formularz pozostaje jedną stroną, chyba że przyszły zakres danych uzasadni prawdziwy wizard,
- publiczny formularz pozostaje `noindex`,
- walidacja serwerowa jest źródłem prawdy,
- nie zbieramy danych bez realnego celu biznesowego.

## Explicit non-goals for v3 core

v3 core nie obejmuje:

- płatności,
- zawierania umowy przez formularz,
- kont użytkowników,
- panelu rodzica,
- pełnego panelu administracyjnego,
- frekwencji,
- automatycznej rezerwacji pojemności grup,
- automatycznego przydzielania grupy,
- zgód marketingowych i wizerunkowych,
- danych zdrowotnych,
- pełnego CRM.

## Anti-references

Unikamy:

- generycznego dashboardu SaaS,
- AI-slop: fioletowych gradientów, glassmorphismu, przypadkowych glowów i card-gridów,
- estetyki żłobka lub przedszkola: tęczy, clipartów, kreskówkowych zwierzątek i nadmiaru pastelowych baniek,
- luksusowej, chłodnej estetyki premium niepasującej do zajęć artystycznych,
- przeładowania teatralnymi ikonami, nutkami i maskami,
- dekoracji konkurujących z polami formularza.

## Design intent

Pierwsze wrażenie: „To jest Pozytywka, twórcze i pełne energii miejsce”.

Drugie, ważniejsze wrażenie: „Wiem dokładnie, co mam teraz zrobić i wiem, co wydarzy się po wysłaniu zgłoszenia”.

## Source of truth

Szczegółowy kontrakt v3 znajduje się w `docs/REGISTRATION_V3_PLAN.md`.
