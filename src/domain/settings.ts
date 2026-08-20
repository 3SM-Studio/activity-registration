import type { SeasonId } from "@/domain/catalog";

export type PublicSettings = Readonly<{
  registrationsOpen: boolean;
  currentSeasonId: SeasonId | null;
  formTitle: string;
  successMessage: string;
  privacyNoticeUrl: string | null;
  privacyNoticeVersion: string | null;
}>;

export const DEFAULT_FORM_TITLE = "Zapisy na zajęcia";
export const DEFAULT_SUCCESS_MESSAGE = "Dziękujemy. Zgłoszenie zostało wysłane.";
