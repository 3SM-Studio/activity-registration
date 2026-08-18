import { describe, expect, it } from "vitest";

import { InvalidPhoneError, normalizePhone } from "@/lib/phone";

describe("normalizePhone", () => {
  it.each([
    ["500000000", "+48500000000"],
    ["500 000 000", "+48500000000"],
    ["+48 500 000 000", "+48500000000"],
    ["0048 500 000 000", "+48500000000"],
    ["+4915112345678", "+4915112345678"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it("rejects an invalid number", () => {
    expect(() => normalizePhone("123")).toThrow(InvalidPhoneError);
  });
});
