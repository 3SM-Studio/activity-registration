# DESIGN.md

## 01 Overview

**Creative North Star: „Scena, zanim podniesie się kurtyna.”**

Pozytywka ma energię miejsca, w którym zaraz coś się wydarzy: próba, śpiew, ruch, wejście na scenę. Interfejs powinien być ciepły i twórczy, ale sam formularz spokojny i łatwy do zeskanowania.

To nie jest strona przedszkola ani szkolny e-dziennik. Marka ma charakter artystyczny i sceniczny, a użytkownik ma czuć, że zapisuje się do żywej pracowni, nie do bezosobowego systemu.

Mobile jest punktem wyjścia. Na małym ekranie najważniejsza jest jedna czytelna kolumna, mocna hierarchia, duże pola i wygodny rytm sekcji. Desktop tylko rozszerza przestrzeń, nie zmienia logiki.

## 02 Colors

### Core

- **Stage Ink** `#29172D` - główny tekst, najciemniejsze elementy, kontrast.
- **Warm Paper** `#FFF8ED` - główne tło strony.
- **Soft Paper** `#FFFCF7` - powierzchnie formularza.
- **Warm Line** `#E8D7C6` - dekoracyjne obramowania i separatory nieinteraktywne.
- **Interactive Line** `#A58D91` - obrys pól formularza, dobrany tak, aby odcinać się od jasnej powierzchni na poziomie około 3:1.

### Brand accents

- **Raspberry Curtain** `#A3205A` - główny akcent, CTA, focus, aktywne detale.
- **Deep Raspberry** `#8D1B4E` - hover i mocniejszy stan akcentu.
- **Stage Teal** `#147A76` - pozytywne stany, wspierający akcent i drobne teksty.
- **Spotlight Gold** `#F6C85F` - dekoracyjny akcent, nigdy jako kolor tekstu na jasnym tle.

### Semantic

- Success używa Stage Teal na bardzo jasnym tealowym tle.
- Error pozostaje czerwony i musi zawierać tekst/ikonę, nie sam kolor.
- Disabled nie może wyglądać jak zwykłe pole aktywne.
- Focus indicator musi być wyraźny także bez rozpoznawania koloru; obecny 4 px ring ma kontrast co najmniej około 3:1 względem jasnej powierzchni.

### Rules

- Brak fioletowych gradientów i neonowych glowów.
- Kolor marki koncentruje się na nagłówku, CTA, focusie i kilku detalach.
- Formularz nie może być wielokolorowy. Jedna sekcja = jedna spokojna powierzchnia.
- `Warm Line` nie jest używany jako jedyna granica interaktywnego inputu, ponieważ jest celowo subtelniejszy niż wymagany kontrast kontrolki.

## 03 Typography

Typografia ma być ludzka i ekspresyjna przez skalę, rytm i wagę, nie przez dekoracyjne fonty kosztem czytelności.

### Display

- system sans stack z ciężarem 700-800,
- zwarte tracking dla dużych nagłówków,
- krótkie linie, maksymalnie 2-3 wiersze na telefonie,
- nagłówki mogą używać lekkiego kontrastu wagi i rozmiaru zamiast ozdobnego kroju.

### Interface

- system sans stack,
- minimum 16 px w polach formularza na mobile,
- etykiety 14-15 px z wagą 600,
- tekst pomocniczy 14-15 px, wysoki line-height,
- placeholdery muszą zachować kontrast normalnego tekstu, nie mogą być ledwo widoczną dekoracją.

### Hierarchy

- H1: wyraźny, ale nie landing-page giant.
- Section title: 18-20 px, 700.
- Labels: spokojne, powtarzalne.
- Eyebrow: uppercase tylko bardzo oszczędnie.

## 04 Elevation

- Projekt jest głównie płaski.
- Główny formularz może mieć jeden miękki, rozlany cień oddzielający go od tła.
- Nie używamy kilku poziomów kart i cieni wewnątrz formularza.
- Focus jest komunikowany ringiem w Raspberry Curtain, nie cieniem imitującym neon.
- Dekoracyjne elementy tła pozostają płaskie i niskokontrastowe.

## 05 Components

### Page shell

- mobile: 16 px bocznego paddingu,
- tablet/desktop: rosnący oddech, formularz ograniczony do wygodnej szerokości,
- header marki i opis znajdują się nad formularzem, nie w osobnym hero na pół ekranu.

### Brand header

- tekstowy wordmark „Pracownia Twórcza Pozytywka”, bez udawania oficjalnego logo,
- mały zestaw abstrakcyjnych kształtów może sugerować ruch/scenę,
- brak clipartowych nut, mikrofonów i masek teatralnych jako głównego motywu.

### Form surface

- jedna główna powierzchnia Soft Paper,
- radius około 24-28 px,
- ciepłe obramowanie,
- sekcje oddzielane przestrzenią i subtelną linią zamiast kolejnych kart.

### Inputs and selects

- minimum 48 px wysokości,
- jasne tło,
- Interactive Line jako normalny border,
- wyraźny Raspberry Curtain focus ring o kontrastowym poziomie,
- tekst Stage Ink,
- placeholder co najmniej neutral-500,
- disabled ma odrębne tło i kursor,
- select zachowuje widoczny natywny affordance/chevron, jeśli nie dostarczamy własnego dostępnego wskaźnika.

### Button

- pełna szerokość na mobile,
- minimum 48 px wysokości,
- Raspberry Curtain jako tło,
- biały tekst,
- Deep Raspberry hover,
- wyraźny 4 px focus ring,
- bez gradientu.

### Guardian section

- wyróżniona bardzo lekkim ciepłym tintem,
- nie wygląda jak alert ani błąd,
- opis jasno tłumaczy, dlaczego pola się pojawiły.

### Success state

- Stage Teal jako akcent,
- komunikat powinien być spokojny i jednoznaczny,
- bez konfetti i ciężkiej animacji.

## 06 Do's and Don'ts

### Do

- Projektuj najpierw dla telefonu.
- Utrzymuj jedną główną akcję na ekranie.
- Buduj hierarchię przez rytm, typografię i whitespace.
- Pozwalaj marce pojawić się w tle i detalach, a nie we wszystkich polach.
- Utrzymuj 44-48 px minimalnych celów dotykowych.
- Testuj długie polskie etykiety, błędy i stany opiekuna.
- Testuj viewporty graniczne 320 px i 430 px.
- Używaj autentycznych nazw Pozytywki tylko wtedy, gdy są potrzebne użytkownikowi.
- Traktuj testy automatyczne jako regresję, a nie zamiennik ręcznego audytu klawiatury, focusu i kontrastu.

### Don't

- Nie używaj glassmorphismu.
- Nie twórz siatki kart wewnątrz formularza.
- Nie dodawaj dekoracyjnych ikon do każdego pola.
- Nie rób interfejsu dziecięcego kosztem młodzieży i rodziców.
- Nie używaj wielu akcentów naraz.
- Nie chowaj wymaganych informacji w tooltipach.
- Nie zmieniaj kolejności pól tylko dla symetrii desktopowej.
- Nie zmniejszaj pól i tekstu na telefonach.
- Nie usuwaj natywnego affordance kontrolki bez dostępnego zamiennika.
