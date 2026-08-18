export const SYSTEM_SCHEMA_VERSION = 1 as const;

export const SHEET = {
  cities: "MIASTA",
  offerings: "OFERTY_ZAJEC",
  registrations: "ZAPISY",
  settings: "USTAWIENIA",
} as const;

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
