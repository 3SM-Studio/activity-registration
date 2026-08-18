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

Systemowe nagłówki:

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
PRIVACY_NOTICE_VERSION
SOURCE
CREATED_AT
UPDATED_AT
SCHEMA_VERSION
```

Snapshoty nazw są celowe. Zmiana nazwy miasta lub zajęć później nie zmienia historycznego znaczenia istniejącego zgłoszenia.

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

## Schema rule

The four system sheets use exact header contracts. Reordering existing headers is supported because mapping is name-based, but adding or removing system columns requires an explicit versioned migration.
