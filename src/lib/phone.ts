export class InvalidPhoneError extends Error {
  constructor() {
    super("Podaj poprawny numer telefonu.");
    this.name = "InvalidPhoneError";
  }
}

export function normalizePhone(input: string): string {
  const compact = input.trim().replace(/[\s().-]/g, "");

  if (compact.startsWith("0048")) {
    const local = compact.slice(4);
    if (/^[1-9]\d{8}$/.test(local)) {
      return `+48${local}`;
    }
  }

  if (/^[1-9]\d{8}$/.test(compact)) {
    return `+48${compact}`;
  }

  if (/^\+[1-9]\d{7,14}$/.test(compact)) {
    return compact;
  }

  throw new InvalidPhoneError();
}
