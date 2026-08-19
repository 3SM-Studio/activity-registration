export function normalizePersonName(value: string): string {
  return value.trim().replace(/\s+/gu, " ");
}

export function sanitizePersonNameWhileTyping(value: string): string {
  return value.replace(/^\s+/u, "").replace(/\s+/gu, " ");
}

export function sanitizeEmailWhileTyping(value: string): string {
  return value.replace(/\s+/gu, "");
}

export function containsWhitespace(value: string): boolean {
  return /\s/u.test(value);
}
