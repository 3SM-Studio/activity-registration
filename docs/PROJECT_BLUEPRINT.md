# Plan projektu systemu zapisów na zajęcia

## Blueprint techniczno-produktowy v0.1

Data: 2026-08-18

## 0. Po co istnieje ten dokument

Ten dokument ma być źródłem prawdy przed rozpoczęciem implementacji.

Ma pozwolić developerowi albo AI wejść do projektu i odpowiedzieć bez zgadywania na pytania:

- co budujemy,
- czego nie budujemy,
- jaki problem rozwiązujemy,
- jakie są główne encje domenowe,
- gdzie znajduje się źródło prawdy,
- jak działa formularz,
- jak działa walidacja,
- jak zapisujemy dane do Google Sheets,
- jak zabezpieczamy system,
- jak zapobiegamy duplikatom,
- jak testujemy,
- jak wdrażamy,
- które decyzje są już zamknięte,
- które decyzje wymagają odpowiedzi właściciela produktu,
- co ma być gotowe przed rozpoczęciem kolejnego etapu.

Ten dokument nie jest specyfikacją prawną. Treści RODO, polityki prywatności, podstawy prawne i wymagane zgody muszą zostać dostarczone lub zatwierdzone przez właściwą osobę po stronie organizatora.

---

# 1. Cel produktu

Zbudować publiczny system zapisów na zajęcia, który:

1. pozwala wybrać miasto,
2. pokazuje tylko zajęcia dostępne w wybranym mieście,
3. zbiera dane uczestnika,
4. dla osoby niepełnoletniej zbiera wymagane dane rodzica lub opiekuna,
5. waliduje dane po stronie klienta i serwera,
6. zapisuje zgłoszenie do Google Sheets,
7. nie pozwala frontendowi bezpośrednio modyfikować arkusza,
8. zachowuje możliwość późniejszej migracji z Google Sheets do normalnej bazy,
9. jest łatwy do obsługi przez organizatora,
10. jest wystarczająco prosty, żeby pierwszą wersję zrobić szybko.

Pierwsza wersja ma być małym, poprawnie zaprojektowanym systemem zapisów, a nie platformą SaaS.

---

# 2. Główne założenie architektoniczne

Rekomendowana architektura:

```text
Użytkownik
   |
   v
Next.js public frontend
   |
   v
Next.js server-side application layer
   |
   v
Repository interfaces
   |
   v
Google Sheets repositories
   |
   v
Google Sheets
```

Google Sheets jest obecnym mechanizmem przechowywania i obsługi danych, ale nie może przenikać do logiki domenowej.

Nie chcemy sytuacji:

```ts
submitRegistration() {
  // 150 linii Google Sheets API
}
```

Chcemy:

```text
SubmitRegistration
        |
        v
RegistrationRepository
        |
        v
GoogleSheetsRegistrationRepository
```

Dzięki temu Google Sheets jest adapterem infrastrukturalnym, nie fundamentem całej aplikacji.

---

# 3. Technologia

## 3.1. Aplikacja

- Next.js
- React
- strict TypeScript
- pnpm
- Zod
- React Hook Form
- shadcn/ui tam, gdzie upraszcza i standaryzuje UI
- test runner: Vitest
- E2E: Playwright

Podczas bootstrapu projektu należy przypiąć konkretne wspierane wersje zależności, zamiast polegać na niekontrolowanym `latest`.

## 3.2. Hosting

Pierwszy wybór developerski:

- Vercel dla preview deployments i prostoty uruchomienia.

Architektura nie może zależeć od Vercela w taki sposób, żeby migracja hostingu wymagała przebudowy domeny.

## 3.3. Dane

- Google Sheets API,
- autoryzacja server-to-server,
- credentials tylko po stronie serwera,
- osobny arkusz TEST,
- osobny arkusz PROD.

---

# 4. Czego nie robimy w MVP

Bez osobnej decyzji nie implementujemy:

- kont użytkowników,
- panelu logowania,
- płatności,
- generowania PDF,
- rozbudowanego systemu mailowego,
- automatycznej listy rezerwowej,
- złożonego RBAC,
- rozbudowanego dashboardu,
- PostgreSQL,
- Supabase,
- AppSheet,
- własnego systemu CMS,
- wieloetapowego workflow dokumentów,
- własnego edytora treści,
- skomplikowanej analityki.

MVP musi być małe.

Architektura ma umożliwić rozwój, ale nie może implementować przyszłości, której jeszcze nie potrzebujemy.

---

# 5. Co bierzemy z projektu Pozytywki

Wzorce warte zachowania:

1. TEST i PROD są rozdzielone.
2. Kontrakty pól są centralne.
3. Kolumny danych są centralnie zdefiniowane.
4. Backend nie ufa frontendowi.
5. Submit jest idempotentny na tyle, na ile pozwala aktualny storage.
6. Krytyczna sekcja zapisu jest możliwie mała.
7. Techniczne ID nie zawierają PII.
8. Nie logujemy PII.
9. Chronimy Sheets przed formula injection.
10. Mamy jawny bootstrap i walidację struktury systemu.
11. Operacje destrukcyjne nie są wykonywane przypadkiem.
12. Mamy quality gate przed wdrożeniem.
13. CI sprawdza projekt.
14. Testujemy zachowanie, nie tylko obecność funkcji.
15. Nie tworzymy drugiej, niezależnej ścieżki logiki biznesowej dla recovery.

---

# 6. Czego nie kopiujemy z Pozytywki

Nie kopiujemy:

1. ręcznej edycji danych źródłowych bez rewalidacji,
2. rozbudowanej state machine maili, jeśli maili jeszcze nie potrzebujemy,
3. luźnych runtime properties rozsianych po systemie,
4. powielonych list zasobów w kilku modułach,
5. słabego `Record<string, CellValue>` jako głównego modelu domenowego,
6. `noImplicitAny: false`,
7. testów opartych głównie o regex i markery,
8. generowanych widoków, które mogą się dezaktualizować bez jasnego mechanizmu odświeżenia,
9. zbyt dużej liczby statusów na starcie,
10. edycji kolumn pochodnych bez jednego kontrolowanego workflow.

---

# 7. Model domeny

Najważniejsza zasada:

Nie zakładamy automatycznie, że "zajęcia" i "konkretna oferta zajęć" to to samo.

## 7.1. Encje podstawowe

### City

```ts
type City = {
  id: CityId;
  name: string;
  active: boolean;
  sortOrder: number;
};
```

### ClassOffering

Minimalny wariant MVP:

```ts
type ClassOffering = {
  id: OfferingId;
  cityId: CityId;
  name: string;
  active: boolean;
  sortOrder: number;
};
```

Jeśli domena wymaga wspólnej definicji typu zajęć niezależnej od miasta, dopiero wtedy wprowadzamy osobne:

```text
Class
ClassOffering
```

Przykład:

```text
Class:
Hip-hop

ClassOffering:
Hip-hop, Gdynia, środa 18:00

ClassOffering:
Hip-hop, Sopot, piątek 17:00
```

Nie normalizujemy tego wcześniej bez potrzeby.

### Registration

```ts
type Registration = {
  id: RegistrationId;
  requestId: RequestId;
  submittedAt: Date;

  offeringId: OfferingId;

  cityIdSnapshot: CityId;
  cityNameSnapshot: string;
  offeringNameSnapshot: string;

  participantFirstName: string;
  participantLastName: string;

  age: number;

  guardianFirstName?: string;
  guardianLastName?: string;

  phone: string;
  email: string;

  status: RegistrationStatus;

  createdAt: Date;
  updatedAt: Date;
};
```

Snapshot nazw jest celowy.

Jeżeli organizator zmieni później:

```text
Hip-hop
```

na:

```text
Hip-hop początkujący
```

historyczne zgłoszenie nadal ma zachować nazwę, która obowiązywała w momencie wysłania.

---

# 8. Wiek uczestnika, decyzja zamknięta

W MVP zostaje pole:

```text
Wiek
```

jako liczba całkowita.

Powód:

- spełnia obecny wymóg biznesowy,
- wystarcza do reguły osoba niepełnoletnia / pełnoletnia,
- zbieramy mniej danych niż przy pełnej dacie urodzenia,
- nie tworzymy dodatkowego PII bez realnej potrzeby.

Jeżeli w przyszłości wiek będzie kwalifikował do grup na konkretną datę albo będzie potrzebna dokładna data urodzenia, wprowadzimy jawny migration path i nową wersję schematu.

---

# 9. Google Sheets jako źródło operacyjne

## 9.1. Arkusz MIASTA

Kolumny:

```text
CITY_ID
NAME
ACTIVE
SORT_ORDER
```

Przykład:

```text
gdynia | Gdynia | TAK | 10
sopot  | Sopot  | TAK | 20
```

## 9.2. Arkusz OFERTY_ZAJEC

Minimalny wariant:

```text
OFFERING_ID
CITY_ID
NAME
ACTIVE
SORT_ORDER
```

Przykład:

```text
off_gdynia_hiphop | gdynia | Hip-hop | TAK | 10
off_gdynia_cont   | gdynia | Contemporary | TAK | 20
off_sopot_hiphop  | sopot  | Hip-hop | TAK | 10
```

Jeżeli potwierdzimy dodatkowe wymagania, model może zostać rozszerzony o:

```text
AGE_MIN
AGE_MAX
DAY_OF_WEEK
START_TIME
END_TIME
INSTRUCTOR
CAPACITY
REGISTRATION_OPEN
```

Nie dodajemy tych pól bez powodu.

## 9.3. Arkusz ZAPISY

Proponowane kolumny techniczne i biznesowe:

```text
REGISTRATION_ID
REQUEST_ID
SUBMITTED_AT

OFFERING_ID

CITY_ID_SNAPSHOT
CITY_NAME_SNAPSHOT
OFFERING_NAME_SNAPSHOT

PARTICIPANT_FIRST_NAME
PARTICIPANT_LAST_NAME
AGE

GUARDIAN_FIRST_NAME
GUARDIAN_LAST_NAME

PHONE
EMAIL

STATUS
NOTES

SOURCE
CREATED_AT
UPDATED_AT
SCHEMA_VERSION
```

## 9.4. Arkusz USTAWIENIA

Minimalnie:

```text
KEY
VALUE
```

Przykładowe klucze:

```text
SYSTEM_SCHEMA_VERSION
REGISTRATIONS_OPEN
PUBLIC_FORM_TITLE
SUCCESS_MESSAGE
```

Nie przechowujemy tutaj sekretów.

## 9.5. AUDIT_LOG

Nie musi wejść do MVP.

Jeżeli organizator ma ręcznie zmieniać status i uwagi, warto dodać później kontrolowany audit:

```text
TIMESTAMP
ACTOR
REGISTRATION_ID
FIELD
ACTION
```

Nie zapisujemy w audycie niepotrzebnych starych i nowych wartości PII.

---

# 10. Własność kolumn w Sheets

To musi być jawne.

## Kolumny systemowe

Nie powinny być ręcznie edytowane:

```text
REGISTRATION_ID
REQUEST_ID
SUBMITTED_AT
OFFERING_ID
CITY_ID_SNAPSHOT
CITY_NAME_SNAPSHOT
OFFERING_NAME_SNAPSHOT
PARTICIPANT_*
GUARDIAN_*
PHONE
EMAIL
CREATED_AT
SCHEMA_VERSION
```

## Kolumny operacyjne

Mogą być edytowane przez organizatora:

```text
STATUS
NOTES
```

Jeżeli biznes wymaga poprawiania danych uczestnika po zapisie, nie otwieramy wszystkich kolumn do swobodnej edycji.

Tworzymy później kontrolowane:

```text
updateRegistration()
```

które:

1. waliduje nowe dane,
2. zapisuje poprawkę,
3. aktualizuje `UPDATED_AT`,
4. wykonuje audit,
5. przelicza ewentualne dane pochodne.

To bezpośrednia lekcja z Pozytywki.

---

# 11. Publiczny formularz

## 11.1. Miasto

- wymagane,
- placeholder: "Wybierz miasto",
- wyświetlane tylko aktywne miasta,
- kolejność według `SORT_ORDER`.

## 11.2. Zajęcia

Stan początkowy:

```text
disabled
Najpierw wybierz miasto
```

Po wybraniu miasta:

1. wyczyść poprzednie `offeringId`,
2. pobierz z już załadowanego katalogu oferty dla miasta,
3. pokaż tylko aktywne oferty,
4. włącz select.

Po zmianie miasta:

```text
offeringId = undefined
```

zawsze.

## 11.3. Imię

- wymagane,
- trim,
- limit długości,
- brak pustych stringów.

## 11.4. Nazwisko

Tak samo.

## 11.5. Wiek

- integer,
- wymagany,
- sensowny zakres ustalony jako kontrakt produktu.

## 11.6. Opiekun

Jeśli:

```text
age < 18
```

to:

```text
guardianFirstName required
guardianLastName required
```

Jeśli wiek zmienia się na 18 lub więcej:

1. pola są ukrywane,
2. `required` jest zdejmowane,
3. poprzednie wartości są czyszczone.

Nie wysyłamy przypadkiem nieaktualnych danych opiekuna.

## 11.7. Telefon

- wymagany,
- walidacja frontendowa,
- normalizacja i walidacja backendowa.

## 11.8. E-mail

- wymagany,
- frontend `type=email`,
- backendowa walidacja Zod,
- normalizacja do ustalonej postaci.

---

# 12. UX formularza

Minimalne wymagania:

- mobile-first,
- prawidłowe labelki,
- obsługa klawiatury,
- focus na pierwszym błędnym polu po submit,
- błędy przy konkretnych polach,
- globalny komunikat tylko dla błędów systemowych,
- formularz nie znika po błędzie sieci,
- submit button blokuje się w trakcie wysyłania,
- podwójne kliknięcie nie uruchamia dwóch logicznych zapisów,
- sukces jest jednoznaczny.

Stan przycisku:

```text
Wyślij zgłoszenie
```

po kliknięciu:

```text
Wysyłanie...
disabled
```

po sukcesie:

```text
Dziękujemy. Zgłoszenie zostało wysłane.
```

Po sukcesie bieżący `requestId` jest uznany za zakończony.

---

# 13. Publiczny katalog

Preferowany przepływ:

```text
Next.js Server Component
        |
        v
GetPublicCatalog
        |
        v
CatalogRepository
        |
        v
Google Sheets
```

Frontend dostaje wyłącznie publiczne dane:

```ts
type PublicCatalog = {
  cities: PublicCity[];
  offerings: PublicOffering[];
};
```

Nie wysyłamy do klienta:

- technicznych notatek,
- prywatnych ustawień,
- adresów e-mail administratorów,
- danych uczestników,
- całych arkuszy.

---

# 14. Submit API

Rekomendowany endpoint:

```text
POST /api/registrations
```

Route Handler jest preferowany nad bezpośrednim zapisaniem logiki w komponencie UI, ponieważ:

- rozdziela UI od aplikacji,
- jest łatwiejszy do testowania,
- może później obsłużyć inny frontend,
- daje jawny kontrakt wejścia i wyjścia.

Request:

```ts
type RegistrationRequest = {
  requestId: string;
  cityId: string;
  offeringId: string;

  participantFirstName: string;
  participantLastName: string;
  age: number;

  guardianFirstName?: string;
  guardianLastName?: string;

  phone: string;
  email: string;
};
```

Odpowiedź sukcesu:

```ts
type RegistrationSuccessResponse = {
  ok: true;
  registrationId: string;
};
```

Odpowiedź błędu:

```ts
type RegistrationErrorResponse = {
  ok: false;
  code:
    | "VALIDATION_ERROR"
    | "REGISTRATIONS_CLOSED"
    | "CITY_NOT_AVAILABLE"
    | "OFFERING_NOT_AVAILABLE"
    | "OFFERING_CITY_MISMATCH"
    | "DUPLICATE_REGISTRATION"
    | "TEMPORARY_UNAVAILABLE"
    | "INTERNAL_ERROR";
};
```

Nie zwracamy użytkownikowi szczegółów Google API.

---

# 15. Backendowy flow submitu

Docelowy przepływ:

```text
POST /api/registrations
        |
        v
parse body
        |
        v
validate schema
        |
        v
load current settings
        |
        v
registrations open?
        |
        v
load current catalog
        |
        v
city exists and active?
        |
        v
offering exists and active?
        |
        v
offering.cityId === cityId?
        |
        v
age and guardian rules valid?
        |
        v
normalize phone/email/names
        |
        v
check requestId
        |
        v
check business duplicate rule
        |
        v
create technical registrationId
        |
        v
escape spreadsheet-dangerous strings
        |
        v
append registration
        |
        v
return success
```

Frontendowe `cityId` i `offeringId` nie są autorytetem.

Backend zawsze sprawdza aktualny katalog.

---

# 16. Idempotencja

Każda próba logicznego wysłania formularza dostaje:

```text
requestId
```

generowany po stronie klienta.

Ten sam `requestId` jest używany podczas retry po błędzie transportowym.

Backend:

1. sprawdza, czy `REQUEST_ID` już istnieje,
2. jeżeli istnieje, zwraca istniejące `REGISTRATION_ID`,
3. jeżeli nie istnieje, wykonuje zapis.

Ważne ograniczenie:

Google Sheets nie jest bazą transakcyjną i sam ten mechanizm nie daje twardej gwarancji unikalności przy dwóch idealnie równoległych zapisach.

Dla publicznego formularza o małym i średnim ruchu:

- zablokowany submit,
- jeden request z przeglądarki,
- stabilny `requestId`,
- backendowa deduplikacja

są wystarczającym kompromisem.

Jeżeli pojawi się wymóg twardej konkurencji o ostatnie miejsce albo bardzo duży ruch, storage transakcyjny musi zostać ponownie oceniony.

---

# 17. Business duplicate vs request duplicate

To dwa różne problemy.

## Technical duplicate

Ten sam request został wysłany ponownie.

Rozwiązanie:

```text
REQUEST_ID
```

## Business duplicate

Przykład:

Ta sama osoba zapisuje się drugi raz na te same zajęcia po 5 minutach.

To wymaga osobnej decyzji biznesowej.

Możliwe reguły:

1. zezwalaj zawsze,
2. blokuj identyczny participant + offering,
3. blokuj participant + email + offering,
4. ostrzegaj, ale zapisuj,
5. zezwalaj na kilka zajęć, ale tylko jedno zgłoszenie na konkretną ofertę.

Ta decyzja musi zostać podjęta przed implementacją finalnej deduplikacji.

---

# 18. Google Sheets adapter

Interfejsy domenowe:

```ts
interface CatalogRepository {
  getPublicCatalog(): Promise<PublicCatalog>;
  getOfferingById(id: OfferingId): Promise<ClassOffering | null>;
}

interface RegistrationRepository {
  findByRequestId(requestId: RequestId): Promise<Registration | null>;
  create(registration: Registration): Promise<void>;
}
```

Opcjonalnie później:

```ts
interface SettingsRepository {
  getPublicSettings(): Promise<PublicSettings>;
}
```

Implementacje:

```text
GoogleSheetsCatalogRepository
GoogleSheetsRegistrationRepository
GoogleSheetsSettingsRepository
```

Żadna funkcja domenowa nie importuje Google API.

---

# 19. Kontrakty Sheets

Nazwy sheetów i kolumn muszą istnieć w jednym miejscu.

Przykład:

```ts
export const SHEET = {
  cities: "MIASTA",
  offerings: "OFERTY_ZAJEC",
  registrations: "ZAPISY",
  settings: "USTAWIENIA",
} as const;
```

Kolumny:

```ts
export const REGISTRATION_COLUMN = {
  registrationId: "REGISTRATION_ID",
  requestId: "REQUEST_ID",
  // ...
} as const;
```

Nigdy nie wpisujemy magicznych stringów z nazwą kolumny w pięciu modułach.

---

# 20. Bootstrap Google Sheet

Nie konfigurujemy produkcji ręcznie "na oko".

Projekt powinien mieć skrypt:

```text
pnpm sheet:bootstrap
```

który:

1. sprawdza dostęp do arkusza,
2. tworzy brakujące zakładki,
3. ustawia nagłówki,
4. ustawia kolejność kolumn,
5. zamraża pierwszy wiersz,
6. dodaje podstawowe formatowanie,
7. ustawia data validation tam, gdzie ma sens,
8. może ukryć kolumny techniczne,
9. nie usuwa istniejących danych bez wyraźnej flagi.

Osobny:

```text
pnpm sheet:validate
```

sprawdza:

- obecność zakładek,
- oczekiwane nagłówki,
- duplikaty nagłówków,
- brak niekompatybilnej zmiany schematu.

Nie polegamy tylko na dokumentacji.

---

# 21. Schema version

Każde zgłoszenie powinno posiadać:

```text
SCHEMA_VERSION
```

np.:

```text
1
```

Jeżeli później dodamy nowe pola lub zmienimy semantykę danych, możemy jednoznacznie rozpoznać starsze zgłoszenia.

---

# 22. Bezpieczeństwo

## 22.1. Credentials

- nigdy w repo,
- nigdy w kodzie client-side,
- nigdy jako `NEXT_PUBLIC_*`,
- tylko env server-side,
- arkusz udostępniony wyłącznie wymaganej tożsamości serwisowej.

## 22.2. Minimalne uprawnienia

Service account ma mieć dostęp tylko do potrzebnych zasobów.

Nie udostępniamy całego Drive bez potrzeby.

## 22.3. PII

Do logów nie trafiają:

- imię,
- nazwisko,
- telefon,
- e-mail,
- dane opiekuna.

Logujemy:

```text
requestId
registrationId
error code
operation
duration
```

## 22.4. Spreadsheet formula injection

Wszystkie wartości użytkownika zapisujemy przez Google Sheets API z:

```text
valueInputOption=RAW
```

Dzięki temu ciągi znaków nie są parsowane jako formuły, daty ani liczby według zasad UI Google Sheets.

Nie używamy `USER_ENTERED` dla payloadu rejestracji.

Dodatkowa funkcja ochronna może pozostać jako defense in depth, ale podstawową gwarancją adaptera jest `RAW`.

## 22.5. Limity wejścia

Backend ustala maksymalną długość wszystkich stringów.

Frontendowy `maxlength` jest tylko UX.

## 22.6. Anti-spam

Przed produkcją podejmujemy decyzję:

- honeypot jako minimum,
- opcjonalna dodatkowa weryfikacja antybotowa,
- monitoring liczby prób.

Nie dokładamy ciężkiego mechanizmu bez danych wskazujących na potrzebę.

---

# 23. Ochrona arkusza

Preferowany model:

- techniczne kolumny ZAPISY są chronione przed przypadkową ręczną edycją,
- organizator edytuje tylko jawnie wskazane kolumny operacyjne,
- katalog MIASTA i OFERTY_ZAJEC jest edytowalnym źródłem konfiguracji.

Jeśli Google Sheets API pozwoli nam wygodnie wdrożyć protections w bootstrapie, bootstrap powinien je założyć.

Jeżeli nie, setup manualny musi być częścią release checklist.

---

# 24. Stan zgłoszenia

MVP:

```ts
type RegistrationStatus = "NEW" | "IN_PROGRESS" | "ACCEPTED" | "CANCELLED";
```

Nie dokładamy kilkunastu stanów bez potrzeby.

Jeżeli później pojawią się:

- płatności,
- dokumenty,
- waitlist,

każdy z tych procesów powinien mieć osobny status, zamiast wciskać wszystko do jednego `RegistrationStatus`.

---

# 25. Konfiguracja otwarcia zapisów

System powinien posiadać:

```text
REGISTRATIONS_OPEN
```

Backend sprawdza to przy każdym submit.

Nie wystarczy ukryć formularza.

Jeżeli ktoś wyśle stary request do API, backend ma zwrócić:

```text
REGISTRATIONS_CLOSED
```

---

# 26. Wyłączenie miasta lub zajęć podczas otwartego formularza

Scenariusz:

1. użytkownik otwiera stronę,
2. widzi Hip-hop,
3. administrator wyłącza Hip-hop,
4. użytkownik klika Wyślij.

Backend pobiera aktualny stan i odrzuca zgłoszenie:

```text
OFFERING_NOT_AVAILABLE
```

Frontend pokazuje komunikat:

```text
Wybrane zajęcia nie są już dostępne. Wybierz inne zajęcia.
```

Nie ufamy katalogowi załadowanemu 5 minut wcześniej.

---

# 27. Cache

MVP nie powinno mieć skomplikowanego cache.

Opcje:

1. brak cache,
2. bardzo krótki cache katalogu.

Preferowany start:

- prostota i aktualność ponad mikrooptymalizację.

Warstwa repozytorium umożliwia dodanie cache później bez zmiany domeny.

---

# 28. Błędy i retry

## Validation error

Nie retry automatyczne.

## Offering changed

Wymaga działania użytkownika.

## Google API temporary failure

Backend zwraca:

```text
TEMPORARY_UNAVAILABLE
```

Frontend zachowuje dane i pozwala spróbować ponownie.

Ten sam retry wykorzystuje ten sam `requestId`.

## Unknown server error

Użytkownik dostaje neutralny komunikat.

Log zawiera techniczny kontekst bez PII.

---

# 29. Observability

Minimum:

- structured logs,
- `requestId`,
- `registrationId`,
- kod operacji,
- kod błędu,
- czas wykonania.

Przykład:

```json
{
  "event": "registration.create.failed",
  "requestId": "req_...",
  "code": "SHEETS_UNAVAILABLE"
}
```

Nie logujemy payloadu formularza.

Zewnętrzny system error tracking jest opcjonalny i nie blokuje MVP.

---

# 30. TEST i PROD

## TEST

- osobny spreadsheet,
- testowe miasta i zajęcia,
- syntetyczne dane uczestników,
- bez realnych PII.

## PROD

- osobny spreadsheet,
- prawdziwa konfiguracja,
- osobne env,
- osobny deployment produkcyjny.

Nie oznaczamy testowych rekordów w tym samym arkuszu produkcyjnym, jeśli możemy ich całkowicie rozdzielić.

---

# 31. Environment variables i uwierzytelnienie Google

## Produkcja na Vercelu

Preferowane uwierzytelnienie:

```text
Vercel OIDC
    ->
Google Workload Identity Federation
    ->
service account impersonation
    ->
Google Sheets API
```

Nie przechowujemy długowiecznego `GOOGLE_PRIVATE_KEY` w produkcyjnych env.

Przykładowe zmienne:

```text
APP_ENV
GOOGLE_SPREADSHEET_ID
GCP_PROJECT_ID
GCP_PROJECT_NUMBER
GCP_SERVICE_ACCOUNT_EMAIL
GCP_WORKLOAD_IDENTITY_POOL_ID
GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID
```

Preview i production dostają osobne principals i osobne arkusze.

## Local development

Preferowane są lokalne, krótkotrwałe credentials lub Application Default Credentials powiązane wyłącznie z TEST.

Lokalny developer nie powinien potrzebować produkcyjnego klucza service account.

Env jest walidowany na starcie przez typed env schema.

Aplikacja nie może uruchomić się jako PROD z brakującym albo testowym spreadsheet ID.

---

# 32. Struktura projektu

Proponowana:

```text
src/
  app/
    page.tsx
    api/
      registrations/
        route.ts

  components/
    registration/
      registration-form.tsx
      city-field.tsx
      offering-field.tsx
      guardian-fields.tsx
      success-state.tsx

  domain/
    city.ts
    class-offering.ts
    registration.ts
    registration-status.ts

  application/
    get-public-catalog.ts
    submit-registration.ts

  infrastructure/
    google-sheets/
      google-auth.ts
      sheets-client.ts
      catalog.repository.ts
      registration.repository.ts
      settings.repository.ts

  validation/
    registration.schema.ts

  lib/
    env.ts
    ids.ts
    phone.ts
    spreadsheet.ts
    logger.ts
    clock.ts

scripts/
  bootstrap-sheet.ts
  validate-sheet.ts
  seed-test-sheet.ts

tests/
  unit/
  integration/
  e2e/
```

To jest wystarczająco rozdzielone, ale nie przesadnie enterprise.

---

# 33. Zasady TypeScript

Włączamy:

```text
strict
noUncheckedIndexedAccess
exactOptionalPropertyTypes
noImplicitOverride
```

Nie używamy:

```text
any
Record<string, unknown>
```

jako podstawowego modelu domeny, jeśli da się opisać typ.

Na granicach systemu:

```text
unknown -> parser -> typed value
```

Przykład:

```text
Google Sheets row
        |
        v
unknown[]
        |
        v
row parser
        |
        v
ClassOffering
```

---

# 34. Walidacja

## Frontend

Cel:

- szybki feedback,
- wygoda użytkownika.

## Backend

Cel:

- integralność systemu.

Backend nigdy nie pomija walidacji dlatego, że frontend już ją wykonał.

## Trzy poziomy

### Structural

Czy payload ma prawidłowy typ.

### Domain

Czy wiek i opiekun są spójne.

### Referential

Czy:

```text
city exists
offering exists
offering belongs to city
both active
```

---

# 35. Normalizacja danych

Przed zapisaniem:

## Imię/nazwisko

- trim,
- bez automatycznej agresywnej zmiany pisowni.

## E-mail

- trim,
- ustalona normalizacja.

## Telefon

- trim,
- usunięcie separatorów,
- walidacja,
- zapis w jednym formacie kanonicznym, jeśli wymagania krajowe są znane.

---

# 36. ID

## City ID

Stabilne techniczne.

```text
city_gdynia
```

## Offering ID

Stabilne techniczne.

```text
off_gdynia_hiphop_01
```

## Registration ID

Losowe lub czasowo-losowe, bez PII.

```text
reg_...
```

## Request ID

UUID lub równoważny losowy identyfikator.

```text
req_...
```

Nie generujemy ID z nazwiska, telefonu ani e-maila.

---

# 37. Testy jednostkowe

Obowiązkowe przypadki:

1. aktywne miasto jest widoczne,
2. nieaktywne miasto nie jest widoczne,
3. oferta jest przypisana do właściwego miasta,
4. oferta z innego miasta jest odrzucana,
5. nieaktywna oferta jest odrzucana,
6. wiek musi być integer,
7. minor wymaga opiekuna,
8. adult nie wymaga opiekuna,
9. po zmianie wieku na adult dane opiekuna nie trafiają do payloadu,
10. telefon normalizuje się poprawnie,
11. niepoprawny e-mail jest odrzucany,
12. formula injection jest neutralizowane,
13. `requestId` jest obsługiwany idempotentnie,
14. snapshoty są tworzone z aktualnego katalogu.

---

# 38. Testy komponentów

Najważniejsze:

1. Zajęcia disabled przed wyborem miasta.
2. Gdynia pokazuje tylko oferty Gdyni.
3. Sopot pokazuje tylko oferty Sopotu.
4. Zmiana miasta czyści wcześniej wybraną ofertę.
5. Minor pokazuje pola opiekuna.
6. Adult ukrywa i czyści pola opiekuna.
7. Błędny e-mail pokazuje błąd.
8. Błędny telefon pokazuje błąd.
9. Submit button blokuje się w trakcie requestu.
10. Błąd serwera nie czyści formularza.
11. Sukces wyświetla finalny success state.

---

# 39. E2E Playwright

Scenariusz happy path:

```text
open form
select Gdynia
select Hip-hop
fill participant
age 17
fill guardian
fill phone/email
submit
see success
```

Scenariusz zmiany miasta:

```text
Gdynia
select Contemporary
change to Sopot
expect offering cleared
expect only Sopot offerings
```

Scenariusz adult:

```text
age 17
guardian visible
fill guardian
change age to 18
guardian hidden
submit
stored guardian fields empty
```

Scenariusz stale catalog:

```text
frontend has offering
backend reports offering inactive
expect user-facing conflict message
```

Scenariusz retry:

```text
first request temporary failure
second request same requestId
only one logical registration
```

---

# 40. Test integracyjny Google Sheets

Nie musi działać przy każdym CI.

Powinien istnieć jawny:

```text
pnpm test:integration:sheets
```

który na arkuszu TEST:

1. waliduje schema,
2. zapisuje syntetyczne zgłoszenie,
3. odczytuje je,
4. sprawdza mapowanie kolumn,
5. usuwa lub oznacza rekord testowy.

Nigdy nie wykonujemy tego na PROD automatycznie.

---

# 41. Quality gate

Minimalny:

```text
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Agregacja:

```text
pnpm check
```

Osobno:

```text
pnpm test:e2e
pnpm sheet:validate
```

Przed produkcją:

```text
pnpm check
pnpm test:e2e
pnpm sheet:validate
```

---

# 42. CI

Na pull request:

1. install z lockfile,
2. format check,
3. lint,
4. typecheck,
5. unit/integration bez realnego Google,
6. build.

Opcjonalnie Playwright, jeśli czas CI jest akceptowalny.

Na branchu produkcyjnym:

- te same checks,
- deployment dopiero po sukcesie.

Nie polegamy tylko na tym, że Vercel "się zbudował".

---

# 43. Deployment flow

```text
feature branch
      |
      v
pull request
      |
      v
CI
      |
      v
preview deployment
      |
      v
manual acceptance
      |
      v
merge
      |
      v
production
```

Preview musi korzystać z TEST data source, nie z produkcyjnych PII.

---

# 44. Bootstrap projektu

Etap techniczny 0:

1. utworzyć repo,
2. skonfigurować pnpm,
3. uruchomić strict TypeScript,
4. ESLint,
5. Prettier,
6. Vitest,
7. Playwright,
8. shadcn/ui,
9. env validation,
10. CI,
11. podstawowy `pnpm check`.

Dopiero potem funkcje produktu.

---

# 45. Implementacja etapami

## Etap 1: Contracts and domain

Tworzymy:

- IDs,
- City,
- ClassOffering,
- Registration,
- statusy,
- Zod schema,
- reguły wieku/opiekuna,
- normalizację.

Acceptance:

- domain nie importuje Next ani Google.

## Etap 2: Sheets infrastructure

Tworzymy:

- auth,
- client,
- sheet contracts,
- parsers,
- repositories,
- bootstrap,
- validator.

Acceptance:

- można odczytać katalog TEST,
- można zapisać syntetyczny Registration do TEST.

## Etap 3: Application services

Tworzymy:

```text
GetPublicCatalog
SubmitRegistration
```

Acceptance:

- pełny backend flow działa z fake repository,
- wszystkie błędy domenowe mają jawne kody.

## Etap 4: UI

Tworzymy formularz.

Acceptance:

- dependency city -> offering,
- guardian logic,
- validation,
- pending/error/success.

## Etap 5: API

Spinamy:

```text
POST /api/registrations
```

Acceptance:

- backend ponownie sprawdza katalog,
- nieaktywnych zajęć nie da się wysłać ręcznym requestem.

## Etap 6: Security hardening

- formula injection,
- PII logs,
- lengths,
- secret review,
- same-origin policy,
- anti-spam minimum.

## Etap 7: Tests

- unit,
- component,
- integration,
- E2E.

## Etap 8: TEST deployment

- TEST Sheet,
- Vercel Preview/TEST,
- synthetic test users,
- acceptance.

## Etap 9: PROD setup

- PROD Sheet,
- bootstrap,
- permissions,
- env,
- production deployment,
- smoke test bez fikcyjnego zaśmiecania produkcji.

---

# 46. Release checklist MVP

Przed produkcją wszystkie odpowiedzi TAK:

## Produkt

- Czy lista miast jest poprawna?
- Czy lista zajęć jest poprawna?
- Czy nieaktywne pozycje są ukryte?
- Czy reguła opiekuna jest zaakceptowana?
- Czy reguła duplikatów jest zaakceptowana?

## Dane

- Czy PROD i TEST są osobne?
- Czy sheet schema jest poprawna?
- Czy kolumny techniczne są chronione?
- Czy snapshoty nazw są zapisywane?

## Security

- Czy sekrety są tylko server-side?
- Czy żaden sekret nie jest w Git?
- Czy logi nie zawierają PII?
- Czy formula injection jest zabezpieczone?

## UX

- Czy mobile działa?
- Czy zmiana miasta resetuje zajęcia?
- Czy minor/adult działa?
- Czy błędy są czytelne?
- Czy retry nie czyści formularza?
- Czy success jest jednoznaczny?

## Backend

- Czy backend waliduje city/offering?
- Czy backend sprawdza aktywność?
- Czy `requestId` jest deduplikowany?
- Czy wyłączone zapisy są blokowane backendowo?

## Engineering

- Czy `pnpm check` przechodzi?
- Czy E2E przechodzą?
- Czy `sheet:validate` przechodzi?
- Czy preview było ręcznie sprawdzone?

---

# 47. Co może wejść później

Kolejność rozwoju, jeśli pojawi się potrzeba:

## 1. E-mail potwierdzający

Osobna state machine, nie boolean `EMAIL_SENT`.

## 2. Limity miejsc

Wtedy trzeba ponownie ocenić Google Sheets pod kątem konkurencji i atomowości.

## 3. Lista rezerwowa

Osobna logika i promocja, nie tylko kolejny ręczny status.

## 4. Edycja zgłoszenia

Kontrolowany command, rewalidacja, audit.

## 5. Panel administratora

Zamiast coraz większej liczby ręcznych operacji w Sheets.

## 6. Płatności

Osobna domena.

## 7. Migracja storage

```text
GoogleSheetsRegistrationRepository
               |
               v
PostgresRegistrationRepository
```

bez przepisywania domeny.

---

# 48. Kryterium momentu migracji z Google Sheets

Nie migrujemy dlatego, że "Postgres jest bardziej profesjonalny".

Migrujemy, gdy realny problem tego wymaga.

Sygnały:

- twarde limity miejsc,
- wiele równoległych zapisów,
- transakcje,
- wiele relacji,
- duże raportowanie,
- rozbudowane uprawnienia,
- edycja przez wielu operatorów,
- potrzeba spójnego audytu,
- złożone zapytania,
- rosnący koszt i kruchość adaptera Sheets.

---

# 49. Decyzje senior-level, zamknięte dla MVP

Poniższe decyzje zastępują wcześniejsze otwarte pytania.

## 49.1. Jedno zgłoszenie

Jedno wysłanie formularza oznacza:

```text
1 uczestnik
+
1 konkretna oferta zajęć
=
1 Registration
```

Jeżeli uczestnik chce zapisać się na dwie różne oferty, wykonuje dwa osobne zgłoszenia.

Powód:

- prosty model,
- prosty audit,
- prosty retry,
- brak tablic `offeringIds` w jednym rekordzie,
- późniejsza anulacja jednych zajęć nie wpływa na drugie.

## 49.2. Duplikaty

W MVP rozróżniamy:

### Technical duplicate

Ten sam logiczny request wysłany ponownie.

Obsługa:

```text
requestId
```

### Business duplicate

Ta sama osoba ponownie świadomie wysyła podobny formularz.

W MVP NIE blokujemy biznesowego duplikatu twardą regułą.

Powód:

- brak jednoznacznego identyfikatora osoby,
- rodzic może używać tego samego telefonu i e-maila dla rodzeństwa,
- imię + nazwisko + wiek nie daje bezpiecznej unikalności,
- twarda deduplikacja może odrzucić poprawne zgłoszenie.

Jeżeli problem pojawi się w realnych danych, dodajemy soft duplicate detection i review, nie automatyczne kasowanie.

## 49.3. Model zajęć

MVP używa jednej encji:

```text
ClassOffering
```

z polami:

```text
id
cityId
name
active
sortOrder
```

Nie tworzymy jeszcze osobnego `Class`.

Powód:

aktualny produkt nie potrzebuje współdzielonej encji typu zajęć niezależnej od konkretnej oferty.

Jeżeli później pojawią się wspólne opisy, grafiki, poziomy lub wiele terminów tej samej klasy, wykonujemy migrację:

```text
Class
+
ClassOffering
```

## 49.4. Wiek

Zostaje integer `age`.

Nie zbieramy daty urodzenia bez potrzeby.

## 49.5. Kontakt

Dla osoby pełnoletniej:

```text
phone + email
=
kontakt do uczestnika
```

Dla osoby niepełnoletniej:

```text
phone + email
=
kontakt do rodzica/opiekuna odpowiedzialnego za zgłoszenie
```

UI ma to komunikować dynamiczną pomocą tekstową.

## 49.6. Zakres po submit w v1

Pierwsza wersja wykonuje:

```text
zapis do Google Sheets
+
jednoznaczny success state
```

Nie wysyła maili.

Powód:

maile dodają osobny problem idempotencji i delivery state. Nie są wymagane przez brief i nie powinny opóźniać poprawnego MVP.

## 49.7. Prywatność i RODO

Technicznie system:

- pokazuje link do aktualnej informacji o prywatności przed submit,
- posiada `PRIVACY_NOTICE_VERSION`,
- zapisuje wersję informacji widoczną przy zgłoszeniu,
- nie wymyśla checkboxa "zgoda na RODO" bez podstawy prawnej,
- nie loguje PII,
- zbiera tylko dane wymagane przez proces.

Treść prawna, administrator danych, podstawa przetwarzania i okres retencji są zewnętrznym inputem prawnym.

Brak zatwierdzonej informacji o prywatności i retencji jest blockerem uruchomienia PROD, ale nie blockerem developmentu na syntetycznych danych TEST.

## 49.8. Retencja

W MVP nie uruchamiamy automatycznego kasowania rekordów bez zatwierdzonej polityki.

Przed PROD musi istnieć jawnie zaakceptowany okres i procedura retencji.

Architektura zachowuje:

```text
createdAt
submittedAt
schemaVersion
privacyNoticeVersion
```

żeby później umożliwić bezpieczną retencję.

## 49.9. Google auth

Produkcja na Vercelu używa:

```text
Vercel OIDC
+
Google Workload Identity Federation
+
service account impersonation
```

Nie przechowujemy produkcyjnego private key service account.

## 49.10. Google Sheets write mode

Wartości użytkownika zapisujemy jako:

```text
valueInputOption=RAW
```

Nie `USER_ENTERED`.

To jest podstawowa ochrona przed interpretacją tekstu jako formuły.

## 49.11. Concurrency

Google Sheets nie jest transakcyjną bazą z constraintem UNIQUE.

MVP świadomie zapewnia:

```text
at-least-once transport handling
+
requestId
+
client submit lock
+
backend retry discipline
+
reconciliation tool
```

Nie obiecujemy matematycznego exactly-once.

Jeżeli produkt dostanie:

- twarde limity miejsc,
- rezerwację ostatniego miejsca,
- wysoki ruch,
- constrainty unikalności wymagające transakcji,

write path migruje do transakcyjnej bazy.

## 49.12. Retry

Dla błędów Google API typu rate limit i chwilowych 5xx:

- ograniczona liczba retry,
- exponential backoff,
- jitter,
- ten sam `requestId`,
- brak nieskończonych retry.

## 49.13. Mapping arkusza

Kod NIE mapuje rekordów po stałym indeksie kolumny.

Adapter:

1. czyta header row,
2. buduje `header -> index`,
3. sprawdza wymagane nagłówki,
4. odrzuca duplikaty nagłówków,
5. mapuje dane po nazwie kontraktu.

Systemowe zakładki mają kontrolowany zestaw nagłówków. Dodatkowe kolumny w `MIASTA`, `OFERTY_ZAJEC`, `ZAPISY` lub `USTAWIENIA` wymagają jawnej migracji schematu. Zapobiega to cichym błędom, np. dodatkowej kolumnie z formułą, która nie byłaby automatycznie kopiowana do nowych wierszy.

## 49.14. Schema management

Rozdzielamy:

```text
sheet:bootstrap
sheet:validate
sheet:migrate
```

`bootstrap` jest idempotentny i niedestrukcyjny.

`validate` niczego nie zmienia.

`migrate` jest jawną operacją wersjonowaną.

Żaden deploy aplikacji nie wykonuje automatycznie destrukcyjnej migracji PROD.

## 49.15. Błędny katalog

Błędy krytyczne:

- brak sheeta,
- brak wymaganych headers,
- duplicate ID,
- duplicate header.

Powodują fail-fast i alarm diagnostyczny.

Pojedynczy niepoprawny rekord oferty:

- nie jest publikowany,
- jest raportowany przez diagnostykę,
- nie rozwala całego formularza, jeśli pozostały katalog jest bezpieczny do użycia.

## 49.16. Anti-spam

MVP:

- honeypot,
- minimalny sensowny czas od renderu do submit,
- limit wielkości requestu,
- brak ujawniania szczegółów błędów,
- obserwacja abuse.

CAPTCHA/Turnstile dokładamy dopiero przy realnym problemie albo przed większą publiczną kampanią.

## 49.17. CSRF

Publiczny endpoint nie posiada sesji ani uprzywilejowanych cookie użytkownika.

Głównym zagrożeniem jest spam, nie klasyczny CSRF.

Route akceptuje oczekiwany content type i działa jako same-origin frontend API. Dodatkowe zabezpieczenia antybotowe są osobnym mechanizmem.

## 49.18. Branding

MVP jest przygotowane pod branding klienta przez tokeny:

```text
logo
colors
font choices
copy
contact details
```

Logika domeny nie zawiera nazwy klienta.

## 49.19. Język

MVP jest po polsku.

Nie instalujemy pełnego i18n bez wymagania.

## 49.20. Accessibility

Minimalny standard engineering:

```text
WCAG 2.2 AA jako cel
```

W praktyce:

- semantyczne labelki,
- poprawne aria tam, gdzie potrzebne,
- obsługa klawiatury,
- focus management,
- komunikaty błędów powiązane z polami,
- wystarczający kontrast,
- brak informacji przekazywanej wyłącznie kolorem.

---

# 50. Recovery i operacje

Projekt musi posiadać jawne narzędzia operacyjne.

## 50.1. Diagnostics

```text
pnpm diagnostics
```

sprawdza co najmniej:

- dostęp do Google,
- spreadsheet ID,
- wymagane sheety,
- schema,
- duplicate IDs,
- invalid catalog rows,
- ustawienia TEST/PROD.

## 50.2. Reconciliation request IDs

```text
pnpm registrations:reconcile
```

działa domyślnie jako dry-run.

Raportuje:

- powtórzone `REQUEST_ID`,
- powtórzone `REGISTRATION_ID`,
- rekordy bez wymaganych identyfikatorów,
- niespójne snapshoty.

Nie usuwa rekordów automatycznie.

## 50.3. Seed TEST

```text
pnpm seed:test
```

tworzy syntetyczny katalog TEST i opcjonalne syntetyczne zgłoszenia.

Komenda ma twardą blokadę przed uruchomieniem dla PROD.

---

# 51. Git i repozytorium

Docelowa nazwa robocza:

```text
3SM-Studio/activity-registration
```

Repo:

```text
private
default branch: main
```

Jeżeli pojawi się nazwa klienta lub produktu, repo można później bezpiecznie przemianować.

Branching:

```text
main
feature/*
fix/*
chore/*
```

Zmiany funkcjonalne trafiają przez PR.

Pierwszy PR:

```text
chore/bootstrap-project
```

---

# 52. Pliki źródła prawdy

Repo od początku powinno zawierać:

```text
README.md
docs/PROJECT_BLUEPRINT.md
docs/DECISIONS.md
docs/ARCHITECTURE.md
docs/SECURITY.md
docs/TESTING.md
docs/DEPLOYMENT.md
docs/RELEASE_CHECKLIST.md
docs/DATA_MODEL.md
```

Zasada:

kod i dokumentacja zmieniają się w tym samym PR, jeżeli zmiana wpływa na zachowanie opisane w dokumentacji.

---

# 53. Dependency policy

Na dzień rozpoczęcia implementacji wybieramy stabilne wydania, nie canary/beta.

Next.js:

```text
16.3.0 stable
```

jest bazą planowanego bootstrapu.

Zależności są przypięte przez `pnpm-lock.yaml`.

Nie aktualizujemy automatycznie major versions podczas budowania MVP.

---

# 54. Ostatnie granice, których senior developer nie może zdecydować za biznes/prawnika

Plan nie ma już otwartych pytań technicznych blokujących implementację.

Pozostają zewnętrzne dane, które można wypełnić później bez zmiany architektury:

1. nazwa klienta i branding,
2. rzeczywista lista miast,
3. rzeczywista lista ofert,
4. treść informacji o prywatności,
5. administrator danych,
6. zatwierdzony okres retencji,
7. docelowa domena,
8. osoby z dostępem do PROD Sheet.

Nie pytamy o nie przed bootstrapem projektu.

Są traktowane jako konfiguracja i release gates, nie jako brak architektury.

---

# 55. Definition of Ready do implementacji

Projekt może wejść w implementację, gdy:

- blueprint v0.2 jest w repo,
- repo jest prywatne,
- CI bootstrap istnieje,
- TEST spreadsheet może zostać utworzony lub wskazany,
- nie używamy realnych PII w development,
- architecture decisions są zapisane.

To wystarcza do rozpoczęcia kodowania.

---

# 56. Definition of Done MVP

MVP jest gotowe, gdy:

1. publiczna strona poprawnie renderuje formularz,
2. katalog pochodzi z Google Sheets,
3. nieaktywne miasta i oferty nie są publiczne,
4. wybór miasta filtruje ofertę,
5. zmiana miasta resetuje ofertę,
6. osoba niepełnoletnia wymaga danych opiekuna,
7. osoba pełnoletnia nie zapisuje pozostałości danych opiekuna,
8. frontend waliduje,
9. backend waliduje niezależnie,
10. backend potwierdza relację city/offering z aktualnym katalogiem,
11. wartości są zapisywane przez `RAW`,
12. retry używa tego samego requestId,
13. endpoint nie loguje PII,
14. TEST i PROD są rozdzielone,
15. produkcja nie używa długowiecznego service account private key,
16. `sheet:validate` przechodzi,
17. `pnpm check` przechodzi,
18. krytyczne testy Playwright przechodzą,
19. diagnostics przechodzą,
20. privacy notice i retention policy są zatwierdzone przed PROD,
21. smoke test produkcyjny przechodzi,
22. dokumentacja odpowiada zachowaniu kodu.

# 57. Retry nieidempotentnych zapisów

Google Sheets `values.append` nie jest retryowane automatycznie wewnątrz klienta. Błędy niejednoznaczne wracają do warstwy aplikacji. Kolejna próba formularza zachowuje `requestId` i najpierw sprawdza, czy rekord już istnieje. To chroni przed duplikatem po sytuacji: zapis po stronie Google zakończył się sukcesem, ale odpowiedź do aplikacji nie dotarła.
