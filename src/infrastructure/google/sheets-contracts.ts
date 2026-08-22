import { REGISTRATION_STATUS } from "@/domain/registration";

export const SYSTEM_SCHEMA_VERSION = 4 as const;

export const SHEET = {
  cities: "MIASTA",
  seasons: "SEZONY",
  offerings: "OFERTY_ZAJEC",
  groups: "GRUPY",
  registrations: "ZAPISY",
  notifications: "POWIADOMIENIA",
  settings: "USTAWIENIA",
} as const;

export const OPERATOR_DASHBOARD_SHEET = "PANEL_OPERATORA";

export const REGISTRATIONS_TABLE_ID = "900001";
export const REGISTRATIONS_TABLE_NAME = "Rejestracje";

export const CITY_HEADERS = ["CITY_ID", "NAME", "ACTIVE", "SORT_ORDER"] as const;

export const SEASON_HEADERS = [
  "SEASON_ID",
  "NAME",
  "START_DATE",
  "END_DATE",
  "ACTIVE",
  "SORT_ORDER",
] as const;

export const LEGACY_OFFERING_HEADERS = [
  "OFFERING_ID",
  "CITY_ID",
  "NAME",
  "ACTIVE",
  "SORT_ORDER",
] as const;

export const OFFERING_HEADERS = [
  "OFFERING_ID",
  "CITY_ID",
  "NAME",
  "PUBLIC_DESCRIPTION",
  "ACTIVE",
  "SORT_ORDER",
  "REGISTRATION_MODE",
  "INTAKE_STATE",
  "REGISTRATION_OPEN_FROM",
  "REGISTRATION_OPEN_TO",
  "WAITLIST_ENABLED",
] as const;

export const GROUP_HEADERS = [
  "GROUP_ID",
  "SEASON_ID",
  "OFFERING_ID",
  "NAME",
  "AGE_MIN",
  "AGE_MAX",
  "DAY_OF_WEEK",
  "START_TIME",
  "END_TIME",
  "LOCATION",
  "INSTRUCTOR",
  "CAPACITY",
  "ACTIVE",
  "SORT_ORDER",
] as const;

export const LEGACY_REGISTRATION_HEADERS = [
  "REGISTRATION_ID",
  "REQUEST_ID",
  "SUBMITTED_AT",
  "OFFERING_ID",
  "CITY_ID_SNAPSHOT",
  "CITY_NAME_SNAPSHOT",
  "OFFERING_NAME_SNAPSHOT",
  "PARTICIPANT_FIRST_NAME",
  "PARTICIPANT_LAST_NAME",
  "AGE",
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

export const V2_REGISTRATION_HEADERS = [
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

export const V3_REGISTRATION_HEADERS = [
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
  "SEASON_ID",
  "SEASON_NAME_SNAPSHOT",
  "ASSIGNED_GROUP_ID",
  "CONTACTED_AT",
  "CONFIRMED_AT",
  "POSSIBLE_DUPLICATE_OF",
  "SCHEMA_VERSION",
] as const;

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
  "SEASON_ID",
  "SEASON_NAME_SNAPSHOT",
  "ASSIGNED_GROUP_ID",
  "CONTACTED_AT",
  "CONFIRMED_AT",
  "CLOSED_AT",
  "POSSIBLE_DUPLICATE_OF",
  "SCHEMA_VERSION",
] as const;

export type RegistrationHeader = (typeof REGISTRATION_HEADERS)[number];

export const REGISTRATION_TABLE_COLUMNS = REGISTRATION_HEADERS.map((columnName, columnIndex) => {
  if (["BIRTH_DATE", "CONTACTED_AT", "CONFIRMED_AT", "CLOSED_AT"].includes(columnName)) {
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

export const NOTIFICATION_HEADERS = [
  "NOTIFICATION_ID",
  "REGISTRATION_ID",
  "TYPE",
  "STATUS",
  "ATTEMPT_COUNT",
  "NEXT_ATTEMPT_AT",
  "LAST_ATTEMPT_AT",
  "LEASE_TOKEN",
  "LEASE_UNTIL",
  "ERROR_CODE",
  "CREATED_AT",
  "UPDATED_AT",
  "SENT_AT",
] as const;

export const SETTINGS_HEADERS = ["KEY", "VALUE"] as const;

export const SHEET_SCHEMA = {
  [SHEET.cities]: CITY_HEADERS,
  [SHEET.seasons]: SEASON_HEADERS,
  [SHEET.offerings]: OFFERING_HEADERS,
  [SHEET.groups]: GROUP_HEADERS,
  [SHEET.registrations]: REGISTRATION_HEADERS,
  [SHEET.notifications]: NOTIFICATION_HEADERS,
  [SHEET.settings]: SETTINGS_HEADERS,
} as const;

export const SETTING_KEY = {
  systemSchemaVersion: "SYSTEM_SCHEMA_VERSION",
  registrationsOpen: "REGISTRATIONS_OPEN",
  currentSeasonId: "CURRENT_SEASON_ID",
  publicFormTitle: "PUBLIC_FORM_TITLE",
  successMessage: "SUCCESS_MESSAGE",
  privacyNoticeUrl: "PRIVACY_NOTICE_URL",
  privacyNoticeVersion: "PRIVACY_NOTICE_VERSION",
} as const;
