import { describe, expect, it } from "vitest";

import {
  decideProductionDeploymentGate,
  PRODUCTION_GATE_SCRIPTS,
} from "../../scripts/vercel-production-gate";

const productionEnv = {
  VERCEL: "1",
  VERCEL_ENV: "production",
  VERCEL_TARGET_ENV: "production",
  VERCEL_OIDC_TOKEN: "test-token",
} satisfies NodeJS.ProcessEnv;

describe("Vercel Production deployment gate", () => {
  it("runs exactly the release-readiness checks in the required order", () => {
    expect(PRODUCTION_GATE_SCRIPTS).toEqual([
      "prod:env:validate",
      "sheet:validate",
      "diagnostics",
    ]);
  });

  it("runs for an unambiguous Vercel Production build with OIDC", () => {
    expect(decideProductionDeploymentGate(productionEnv)).toEqual({
      run: true,
      reason: "production",
      target: "production",
    });
  });

  it("skips outside Vercel", () => {
    expect(decideProductionDeploymentGate({})).toEqual({
      run: false,
      reason: "not-vercel",
      target: null,
    });
  });

  it("skips Vercel Preview without requiring a Production OIDC token", () => {
    expect(
      decideProductionDeploymentGate({
        VERCEL: "1",
        VERCEL_ENV: "preview",
        VERCEL_TARGET_ENV: "preview",
      }),
    ).toEqual({
      run: false,
      reason: "non-production",
      target: "preview",
    });
  });

  it("fails closed when Vercel environment markers conflict", () => {
    expect(() =>
      decideProductionDeploymentGate({
        ...productionEnv,
        VERCEL_TARGET_ENV: "preview",
      }),
    ).toThrow("Conflicting Vercel environment markers");
  });

  it("fails closed when the Vercel environment cannot be determined", () => {
    expect(() => decideProductionDeploymentGate({ VERCEL: "1" })).toThrow(
      "Cannot determine Vercel deployment environment",
    );
  });

  it("fails closed when Production build OIDC is missing", () => {
    expect(() =>
      decideProductionDeploymentGate({
        VERCEL: "1",
        VERCEL_ENV: "production",
        VERCEL_TARGET_ENV: "production",
      }),
    ).toThrow("VERCEL_OIDC_TOKEN is missing");
  });
});
