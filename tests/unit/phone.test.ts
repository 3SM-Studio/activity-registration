import { describe, expect, it } from "vitest";

import { InvalidPhoneError, normalizePhone } from "@/lib/phone";

describe("normalizePhone", () => {
  it.each([
    ["500000000", "+48500000000"],
    ["500 000 000", "+48500000000"],
    ["+48 500 000 000", "+48500000000"],
    ["0048 500 000 000", "+48500000000"],
    ["58 500 00 00", "+48585000000"],
    ["+49 151 12345678", "+4915112345678"],
    ["+1 (213) 373-4253", "+12133734253"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(["123", "abc500000000", "+48 123"])('rejects invalid input "%s"', (input) => {
    expect(() => normalizePhone(input)).toThrow(InvalidPhoneError);
  });
});
