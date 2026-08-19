# Data model

This document separates the **currently implemented schema v2** from the **target v3 model**. Do not treat target v3 fields as already deployed until the explicit migration PR is merged and verified.

## Current implemented schema v2

### MIASTA

| Column     | Meaning                |
| ---------- | ---------------------- |
| CITY_ID    | stabilne techniczne ID |
| NAME       | publiczna nazwa        |
| ACTIVE     | TAK/NIE                |
| SORT_ORDER | kolejność              |

### OFERTY_ZAJEC

| Column      | Meaning                |
| ----------- | ---------------------- |
| OFFERING_ID | stabilne techniczne ID |
| CITY_ID     | relacja do miasta      |
| NAME        | publiczna nazwa zajęć  |
| ACTIVE      | TAK/NIE                |
| SORT_ORDER  | kolejność              |

### ZAPISY

`ZAPISY` jest natywną Google Sheets Table o nazwie `Rejestracje`. Kod zapisuje nowe rekordy do body tabeli przez `AppendCellsRequest`, używając `tableId` oraz odpowiadającego `sheetId` rozwiązanego z metadata arkusza.

Systemowe nagłówki schema v2:

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
BIRTH_DATE
AGE_AT_SUBMISSION
GUARDIAN_FIRST_NAME
GUARDIAN_LAST_NAME
PHONE
EMAIL
STATUS
NOTES
PRIVACY_NOTICE_VERSION
SOURCE
CREATED_AT
UPDATED_AT
SCHEMA_VERSION
```

`BIRTH_DATE` jest źródłową datą urodzenia dla nowych zapisów. `AGE_AT_SUBMISSION` jest snapshotem wieku w dniu przyjęcia zgłoszenia.

Migracja v1 -> v2 była niedestrukcyjna. Dawna kolumna `AGE` stała się `AGE_AT_SUBMISSION`, a przed nią została wstawiona `BIRTH_DATE`. Historyczne rekordy v1 zachowują stary wiek, mają pustą `BIRTH_DATE` i pozostają oznaczone `SCHEMA_VERSION=1`. Nie odgadujemy historycznych dat urodzenia.

Snapshoty nazw są celowe. Zmiana nazwy miasta lub zajęć później nie zmienia historycznego znaczenia istniejącego zgłoszenia.

Typy v2:

- `BIRTH_DATE`: `DATE`,
- `AGE_AT_SUBMISSION`: `DOUBLE`,
- `STATUS`: `DROPDOWN` z `NEW`, `IN_PROGRESS`, `ACCEPTED`, `CANCELLED`,
- `SCHEMA_VERSION`: `DOUBLE`,
- pozostałe kolumny: głównie `TEXT`.

Kolumny techniczne są objęte warning-only protections. `STATUS` i `NOTES` są celowo edytowalne dla operatora.

### USTAWIENIA v2

```text
KEY
VALUE
```

Obsługiwane klucze:

```text
SYSTEM_SCHEMA_VERSION
REGISTRATIONS_OPEN
PUBLIC_FORM_TITLE
SUCCESS_MESSAGE
PRIVACY_NOTICE_URL
PRIVACY_NOTICE_VERSION
```

Aktualny zaimplementowany `SYSTEM_SCHEMA_VERSION` to `2`.

## Target schema v3

v3 dodaje model biznesowy potrzebny do poprawnej obsługi sezonów, okien zapisów, listy rezerwowej, wewnętrznego przypisania grupy i biznesowej deduplikacji.

### SEZONY

Nowy arkusz:

```text
SEASON_ID
NAME
START_DATE
END_DATE
ACTIVE
SORT_ORDER
```

Przykład syntetyczny:

```text
2026-2027 | 2026/2027 | 2026-09-01 | 2027-07-31 | TRUE | 10
```

Bieżący sezon zapisów ma być wskazywany jawnie przez `CURRENT_SEASON_ID`.

### OFERTY_ZAJEC v3

Docelowy kontrakt:

```text
OFFERING_ID
CITY_ID
NAME
PUBLIC_DESCRIPTION
ACTIVE
SORT_ORDER
REGISTRATION_MODE
INTAKE_STATE
REGISTRATION_OPEN_FROM
REGISTRATION_OPEN_TO
WAITLIST_ENABLED
```

`REGISTRATION_MODE`:

```text
ROLLING
WINDOWED
```

`INTAKE_STATE`:

```text
OPEN
WAITLIST_ONLY
CLOSED
```

`WINDOWED` wymaga poprawnego zakresu `REGISTRATION_OPEN_FROM <= REGISTRATION_OPEN_TO`.

Nie dodajemy ceny, płatności ani godzin grup bez zweryfikowanych danych od Iwony.

### GRUPY

Nowy wewnętrzny arkusz:

```text
GROUP_ID
SEASON_ID
OFFERING_ID
NAME
AGE_MIN
AGE_MAX
DAY_OF_WEEK
START_TIME
END_TIME
LOCATION
INSTRUCTOR
CAPACITY
ACTIVE
SORT_ORDER
```

`Group` jest wewnętrznym przypisaniem po weryfikacji. Nie jest publicznym wymaganym wyborem formularza.

Początkowo `GRUPY` może zawierać wyłącznie kontrakt nagłówków, dopóki nie dostaniemy realnego katalogu od Iwony. Nie wolno wymyślać grup.

### ZAPISY v3

Nowe pola:

```text
SEASON_ID
SEASON_NAME_SNAPSHOT
ASSIGNED_GROUP_ID
CONTACTED_AT
CONFIRMED_AT
POSSIBLE_DUPLICATE_OF
```

Docelowe statusy:

```text
NEW
IN_REVIEW
CONTACTED
WAITLISTED
CONFIRMED
REJECTED
CANCELLED
```

`CONFIRMED` oznacza zakończoną weryfikację i potwierdzoną konkretną możliwość uczestnictwa. Nie jest to tracking późniejszej frekwencji.

Historyczne v1/v2 rekordy mogą mieć puste nowe pola. Nie odgadujemy sezonu, grupy ani timestampów.

`ZAPISY` pozostaje jedną natywną Google Sheets Table i jedynym źródłem prawdy dla zgłoszeń.

### Operator-first view

Docelowo operator powinien widzieć najpierw:

```text
STATUS
PARTICIPANT_FIRST_NAME
PARTICIPANT_LAST_NAME
BIRTH_DATE
AGE_AT_SUBMISSION
OFFERING_NAME_SNAPSHOT
CITY_NAME_SNAPSHOT
GUARDIAN_FIRST_NAME
GUARDIAN_LAST_NAME
PHONE
EMAIL
SUBMITTED_AT
ASSIGNED_GROUP_ID
CONTACTED_AT
CONFIRMED_AT
NOTES
```

Techniczne kolumny pozostają w rekordzie, ale powinny być przesunięte na prawo lub ukryte w normalnym widoku operatora.

### USTAWIENIA v3

Do istniejących ustawień dochodzi:

```text
CURRENT_SEASON_ID
```

Nie przenosimy całej konfiguracji biznesowej do `USTAWIENIA`.

## Business duplicate identity

v3 rozdziela transportowe `requestId` od biznesowej deduplikacji.

Biznesowa tożsamość zgłoszenia opiera się na znormalizowanych:

```text
participant first name
participant last name
BIRTH_DATE
CITY_ID
OFFERING_ID
SEASON_ID
```

Telefon E.164 i znormalizowany e-mail są dodatkowymi sygnałami dokładnego duplikatu.

- exact active duplicate: nie tworzy nowego wiersza,
- probable duplicate z innym kontaktem: tworzy rekord z `POSSIBLE_DUPLICATE_OF`,
- inne zajęcia lub inny sezon: prawidłowe nowe zgłoszenie,
- legacy bez DOB: nie może twardo zablokować zgłoszenia na podstawie odgadniętej tożsamości.

Google Sheets nie daje atomowego uniqueness constraint, więc to soft deduplication. Twarda gwarancja uruchamia storage review.

## Schema rules

- Current runtime remains v2 until migration v2 -> v3 is implemented.
- Target versions after migration: `SYSTEM_SCHEMA_VERSION=3`, `REGISTRATION_SCHEMA_VERSION=3`.
- Mapping remains header-name based.
- Reordering can be supported, but adding/removing system columns requires explicit versioned migration.
- Migration must be TEST-first, idempotent, non-destructive and backed up before execution.
- Unknown historical values stay empty rather than guessed.

See `docs/REGISTRATION_V3_PLAN.md` for the complete target contract.
