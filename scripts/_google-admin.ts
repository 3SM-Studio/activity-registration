import { GoogleSheetsClient } from "../src/infrastructure/google/sheets-client";
import { getServerEnv } from "../src/lib/env";

export function createAdminSheetsClient(): GoogleSheetsClient {
  const env = getServerEnv();

  if (env.DATA_BACKEND !== "google-sheets") {
    throw new Error(
      "This command requires DATA_BACKEND=google-sheets. It will not run against memory.",
    );
  }

  if (!env.GOOGLE_SPREADSHEET_ID) {
    throw new Error("GOOGLE_SPREADSHEET_ID is required.");
  }

  return new GoogleSheetsClient(env, env.GOOGLE_SPREADSHEET_ID);
}
