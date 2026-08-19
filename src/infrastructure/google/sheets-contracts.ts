import { REGISTRATION_STATUS } from "@/domain/registration";

export const SYSTEM_SCHEMA_VERSION = 2 as const;

export const SHEET = {
  cities: "MIASTA",
  offerings: "OFERTY_ZAJEC",
  registrations: "ZAPISY",
  settings: "USTAWIENIA",
} as const;

export const REGISTRATIONS_TABLE_ID = "900001";
export const REGISTRATIONS_TABLE_NAME = "Rejestracje";

export const CITY_HEADERS = ["CITY_ID", "NAME", "ACTIVE", "SORT_ORDER"] as const;

export const OFFERING_HEADERS = ["OFFERING_ID", "CITY_ID", "NAME", "ACTIVE", "SORT_ORDER"] as const;

export const REGISTRATION_HEADERS = [
  "REGISTRATION_ID",
  "REQUEST_ID",
  "SUBMITTED_AT",
  "OFFERING_ID",
  "CITY_ID_SNAPSHOT",
  "CITY_NAME_SNAPSHOT",
  "OFFERING_NAME_SNAPSHOT",
  "PARTICIPANT_FIRST_NAME",
  "PARTICIPANT_LAST_NAME",
  "BIRTH_DATE",
  "AGE_AT_SUBMISSION",
  "GUARDIAN_FIRST_NAME",
  "GUARDIAN_LAST_NAME",
  "PHONE",
  "EMAIL",
  "STATUS",
  "NOTES",
  "PRIVACY_NOTICE_VERSION",
  "SOURCE",
  "CREATED_AT",
  "UPDATED_AT",
  "SCHEMA_VERSION",
] as const;

export type RegistrationHeader = (typeof REGISTRATION_HEADERS)[number];

export const REGISTRATION_TABLE_COLUMNS = REGISTRATION_HEADERS.map((columnName, columnIndex) => {
  if (columnName === "BIRTH_DATE") {
    return { columnIndex, columnName, columnType: "DATE" } as const;
  }

  if (columnName === "AGE_AT_SUBMISSION" || columnName === "SCHEMA_VERSION") {
    return { columnIndex, columnName, columnType: "DOUBLE" } as const;
  }

  if (columnName === "STATUS") {
    return {
      columnIndex,
      columnName,
      columnType: "DROPDOWN",
      dataValidationRule: {
        condition: {
          type: "ONE_OF_LIST",
          values: Object.values(REGISTRATION_STATUS).map((value) => ({ userEnteredValue: value })),
        },
      },
    } as const;
  }

  return { columnIndex, columnName, columnType: "TEXT" } as const;
});

export const SETTINGS_HEADERS = ["KEY", "VALUE"] as const;

export const SHEET_SCHEMA = {
  [SHEET.cities]: CITY_HEADERS,
  [SHEET.offerings]: OFFERING_HEADERS,
  [SHEET.registrations]: REGISTRATION_HEADERS,
  [SHEET.settings]: SETTINGS_HEADERS,
} as const;

export const SETTING_KEY = {
  systemSchemaVersion: "SYSTEM_SCHEMA_VERSION",
  registrationsOpen: "REGISTRATIONS_OPEN",
  publicFormTitle: "PUBLIC_FORM_TITLE",
  successMessage: "SUCCESS_MESSAGE",
  privacyNoticeUrl: "PRIVACY_NOTICE_URL",
  privacyNoticeVersion: "PRIVACY_NOTICE_VERSION",
} as const;
