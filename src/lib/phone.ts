import { parsePhoneNumberFromString } from "libphonenumber-js";

const PHONE_CHARACTERS = /^[+\d\s().-]+$/;

export class InvalidPhoneError extends Error {
  constructor() {
    super("Podaj poprawny numer telefonu.");
    this.name = "InvalidPhoneError";
  }
}

export function normalizePhone(input: string): string {
  const trimmed = input.trim();

  if (!trimmed || !PHONE_CHARACTERS.test(trimmed)) {
    throw new InvalidPhoneError();
  }

  const normalizedPrefix = trimmed.startsWith("00") ? `+${trimmed.slice(2)}` : trimmed;
  const phoneNumber = parsePhoneNumberFromString(normalizedPrefix, "PL");

  if (!phoneNumber || phoneNumber.ext || !phoneNumber.isPossible()) {
    throw new InvalidPhoneError();
  }

  return phoneNumber.number;
}
