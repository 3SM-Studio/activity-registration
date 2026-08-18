import { describe, expect, it } from "vitest";

import {
  buildRowByHeaders,
  createHeaderMap,
  SheetSchemaError,
} from "@/infrastructure/google/header-map";

describe("createHeaderMap", () => {
  it("maps required headers by name even when their order changes", () => {
    const headers = createHeaderMap(
      ["REQUEST_ID", "REGISTRATION_ID"],
      ["REGISTRATION_ID", "REQUEST_ID"],
    );

    expect(headers.get("REGISTRATION_ID")).toBe(1);
    expect(headers.get("REQUEST_ID")).toBe(0);
  });

  it("rejects unexpected columns by default", () => {
    expect(() =>
      createHeaderMap(
        ["EXTRA", "REQUEST_ID", "REGISTRATION_ID"],
        ["REGISTRATION_ID", "REQUEST_ID"],
      ),
    ).toThrow(/Unexpected spreadsheet headers: EXTRA/);
  });

  it("can explicitly allow extra columns for non-system tooling", () => {
    const headers = createHeaderMap(
      ["EXTRA", "REQUEST_ID", "REGISTRATION_ID"],
      ["REGISTRATION_ID", "REQUEST_ID"],
      { allowUnexpected: true },
    );

    expect(headers.get("EXTRA")).toBe(0);
  });

  it("rejects duplicate headers", () => {
    expect(() => createHeaderMap(["REQUEST_ID", "REQUEST_ID"], ["REQUEST_ID"])).toThrow(
      SheetSchemaError,
    );
  });

  it("rejects missing required headers", () => {
    expect(() => createHeaderMap(["REQUEST_ID"], ["REQUEST_ID", "REGISTRATION_ID"])).toThrow(
      SheetSchemaError,
    );
  });
});

describe("buildRowByHeaders", () => {
  it("writes data in the current sheet order", () => {
    expect(
      buildRowByHeaders(["REQUEST_ID", "REGISTRATION_ID"], {
        REQUEST_ID: "req_1",
        REGISTRATION_ID: "reg_1",
      }),
    ).toEqual(["req_1", "reg_1"]);
  });
});
