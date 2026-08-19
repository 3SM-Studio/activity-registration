import { describe, expect, it } from "vitest";

import {
  containsWhitespace,
  normalizePersonName,
  sanitizeEmailWhileTyping,
  sanitizePersonNameWhileTyping,
} from "@/lib/text-normalization";

describe("text normalization", () => {
  it("blocks leading whitespace and collapses repeated whitespace while typing a name", () => {
    expect(sanitizePersonNameWhileTyping("   Anna   Maria")).toBe("Anna Maria");
  });

  it("keeps a single valid internal space in a name", () => {
    expect(sanitizePersonNameWhileTyping("van der Meer")).toBe("van der Meer");
  });

  it("trims and normalizes person names for storage", () => {
    expect(normalizePersonName("  de   la   Cruz  ")).toBe("de la Cruz");
  });

  it("removes all whitespace from email input while typing", () => {
    expect(sanitizeEmailWhileTyping(" jan @ example.com ")).toBe("jan@example.com");
  });

  it("detects whitespace inside text", () => {
    expect(containsWhitespace("jan @example.com")).toBe(true);
    expect(containsWhitespace("jan@example.com")).toBe(false);
  });
});
