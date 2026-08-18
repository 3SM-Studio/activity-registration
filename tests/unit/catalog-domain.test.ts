import { describe, expect, it } from "vitest";

import { isTechnicalId } from "@/domain/catalog";

describe("technical IDs", () => {
  it.each(["gdynia", "gdynia-hiphop", "off_gdynia_01", "a"])("accepts %s", (value) => {
    expect(isTechnicalId(value)).toBe(true);
  });

  it.each(["", "Gdynia", "gdynia hiphop", "żajecia", "-gdynia", "_gdynia", "a".repeat(101)])(
    "rejects %s",
    (value) => {
      expect(isTechnicalId(value)).toBe(false);
    },
  );
});
