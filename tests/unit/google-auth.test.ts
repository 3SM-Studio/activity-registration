import { describe, expect, it } from "vitest";

import { GoogleAuthenticationError, toGoogleAuthenticationError } from "@/infrastructure/google/auth";

describe("Google authentication error sanitization", () => {
  it("does not retain sensitive details from provider errors", () => {
    const providerError = new Error(
      "invalid_grant subject_token=eyJhbGciOiJIUzI1NiJ9.secret service_account=private@example.com",
    );

    const sanitized = toGoogleAuthenticationError(providerError);

    expect(sanitized).toBeInstanceOf(GoogleAuthenticationError);
    expect(sanitized.name).toBe("GoogleAuthenticationError");
    expect(sanitized.message).toBe("Google authentication failed.");
    expect(sanitized.message).not.toContain("subject_token");
    expect(sanitized.message).not.toContain("secret");
    expect("cause" in sanitized).toBe(false);
  });
});
