# Data model

## MIASTA

| Column     | Meaning                |
| ---------- | ---------------------- |
| CITY_ID    | stabilne techniczne ID |
| NAME       | publiczna nazwa        |
| ACTIVE     | TAK/NIE                |
| SORT_ORDER | kolejność              |

## OFERTY_ZAJEC

| Column      | Meaning                |
| ----------- | ---------------------- |
| OFFERING_ID | stabilne techniczne ID |
| CITY_ID     | relacja do miasta      |
| NAME        | publiczna nazwa zajęć  |
| ACTIVE      | TAK/NIE                |
| SORT_ORDER  | kolejność              |

## ZAPISY

`ZAPISY` jest natywną Google Sheets Table o nazwie `Rejestracje`. Kod zapisuje nowe rekordy do body tabeli przez `AppendCellsRequest`, używając stałego `tableId` i odpowiadającego mu `sheetId` odczytanego z metadata arkusza.

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

`BIRTH_DATE` jest źródłową datą urodzenia dla nowych zapisów. `AGE_AT_SUBMISSION` jest wyliczonym snapshotem wieku w dniu przyjęcia zgłoszenia, dzięki czemu historyczne raporty nie zmieniają znaczenia wraz z upływem czasu.

Migracja v1 -> v2 jest niedestrukcyjna. Dawna kolumna `AGE` staje się `AGE_AT_SUBMISSION`, a przed nią wstawiana jest nowa kolumna `BIRTH_DATE`. Istniejące rekordy v1 zachowują historyczny wiek, mają pustą `BIRTH_DATE` i pozostają oznaczone `SCHEMA_VERSION=1`. Nie próbujemy odgadywać dat urodzenia ze starego wieku.

Snapshoty nazw są celowe. Zmiana nazwy miasta lub zajęć później nie zmienia historycznego znaczenia istniejącego zgłoszenia.

### Typy kolumn tabeli

- `BIRTH_DATE`: `DATE`,
- `AGE_AT_SUBMISSION`: `DOUBLE`,
- `STATUS`: `DROPDOWN` z `NEW`, `IN_PROGRESS`, `ACCEPTED`, `CANCELLED`,
- `SCHEMA_VERSION`: `DOUBLE`,
- pozostałe kolumny: `TEXT`.

Kolumny systemowe są objęte warning-only protections. `STATUS` i `NOTES` pozostają celowo edytowalne dla operatorów Pozytywki.

## USTAWIENIA

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

Aktualny `SYSTEM_SCHEMA_VERSION` to `2`.

## Schema rule

The four system sheets use exact header contracts. Reordering existing headers is supported because mapping is name-based, but adding or removing system columns requires an explicit versioned migration.
