import { describe, expect, it } from "vitest";

import { registrationRequestSchema } from "@/validation/registration.schema";

const base = {
  requestId: "11111111-1111-4111-8111-111111111111",
  cityId: "gdynia",
  offeringId: "gdynia-hiphop",
  participantFirstName: "Jan",
  participantLastName: "Kowalski",
  age: 18,
  phone: "500 000 000",
  email: "jan@example.com",
  renderedAt: Date.now() - 2_000,
  website: "",
};

describe("registrationRequestSchema", () => {
  it("accepts an adult without guardian data", () => {
    const result = registrationRequestSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("requires guardian data for a minor", () => {
    const result = registrationRequestSchema.safeParse({ ...base, age: 17 });
    expect(result.success).toBe(false);

    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      expect(fields.guardianFirstName?.[0]).toBeTruthy();
      expect(fields.guardianLastName?.[0]).toBeTruthy();
    }
  });

  it("accepts a minor with guardian data", () => {
    const result = registrationRequestSchema.safeParse({
      ...base,
      age: 17,
      guardianFirstName: "Anna",
      guardianLastName: "Kowalska",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a non-integer age", () => {
    expect(registrationRequestSchema.safeParse({ ...base, age: 17.5 }).success).toBe(false);
  });

  it("rejects invalid email", () => {
    expect(registrationRequestSchema.safeParse({ ...base, email: "not-an-email" }).success).toBe(
      false,
    );
  });

  it("trims a valid email before returning parsed data", () => {
    const result = registrationRequestSchema.safeParse({
      ...base,
      email: "  JAN@EXAMPLE.COM  ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("JAN@EXAMPLE.COM");
    }
  });
});
