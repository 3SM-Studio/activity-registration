export const POZYTYWKA_EMAIL_LOGO_CID = "pozytywka-logo";
export const POZYTYWKA_EMAIL_LOGO_SRC = `cid:${POZYTYWKA_EMAIL_LOGO_CID}`;

const EMAIL_ASSET_COMMIT = "6e7dd54855418443c00363ce0155b6dd450bf947";

export const POZYTYWKA_EMAIL_LOGO_ATTACHMENT = {
  path: `https://raw.githubusercontent.com/3SM-Studio/activity-registration/${EMAIL_ASSET_COMMIT}/public/pozytywka-logo.webp`,
  filename: "pozytywka-logo.webp",
  contentId: POZYTYWKA_EMAIL_LOGO_CID,
} as const;
