import { parsePhoneNumberFromString } from "libphonenumber-js/max";

const PHONE_CHARACTERS = /^[+\d\s().-]+$/;

export class InvalidPhoneError extends Error {
  constructor() {
    super("Podaj poprawny numer telefonu.");
    this.name = "InvalidPhoneError";
  }
}

function parseValidPhone(input: string) {
  const trimmed = input.trim();

  if (!trimmed || !PHONE_CHARACTERS.test(trimmed)) {
    return null;
  }

  const normalizedPrefix = trimmed.startsWith("00") ? `+${trimmed.slice(2)}` : trimmed;
  const phoneNumber = parsePhoneNumberFromString(normalizedPrefix, "PL");

  if (!phoneNumber || phoneNumber.ext || !phoneNumber.isValid()) {
    return null;
  }

  return phoneNumber;
}

export function isValidPhone(input: string): boolean {
  return parseValidPhone(input) !== null;
}

export function normalizePhone(input: string): string {
  const phoneNumber = parseValidPhone(input);

  if (!phoneNumber) {
    throw new InvalidPhoneError();
  }

  return phoneNumber.number;
}
