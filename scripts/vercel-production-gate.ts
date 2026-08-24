import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const PRODUCTION_GATE_SCRIPTS = [
  "prod:env:validate",
  "sheet:validate",
  "diagnostics",
] as const;

type GateDecision = Readonly<
  | { run: false; reason: "not-vercel" | "non-production"; target: string | null }
  | { run: true; reason: "production"; target: "production" }
>;

type EnvironmentSnapshot = Readonly<Record<string, string | undefined>>;

export function decideProductionDeploymentGate(env: EnvironmentSnapshot): GateDecision {
  if (env.VERCEL !== "1") {
    return { run: false, reason: "not-vercel", target: null };
  }

  const vercelEnv = env.VERCEL_ENV?.trim() || null;
  const targetEnv = env.VERCEL_TARGET_ENV?.trim() || null;

  if (vercelEnv && targetEnv && vercelEnv !== targetEnv) {
    throw new Error(
      `Conflicting Vercel environment markers: VERCEL_ENV=${vercelEnv}, VERCEL_TARGET_ENV=${targetEnv}.`,
    );
  }

  const target = targetEnv ?? vercelEnv;
  if (!target) {
    throw new Error("Cannot determine Vercel deployment environment; refusing to skip the gate.");
  }

  if (target !== "production") {
    return { run: false, reason: "non-production", target };
  }

  if (!env.VERCEL_OIDC_TOKEN?.trim()) {
    throw new Error("VERCEL_OIDC_TOKEN is missing in a Production deployment build.");
  }

  return { run: true, reason: "production", target: "production" };
}

function requirePnpmCli(env: NodeJS.ProcessEnv): string {
  const pnpmCli = env.npm_execpath?.trim();
  if (!pnpmCli) {
    throw new Error("npm_execpath is missing; run the Production gate through pnpm.");
  }
  return pnpmCli;
}

function runPnpmScript(script: string, env: NodeJS.ProcessEnv): void {
  const pnpmCli = requirePnpmCli(env);
  const result = spawnSync(process.execPath, [pnpmCli, script], {
    stdio: "inherit",
    env,
  });

  if (result.error) {
    throw new Error(`Failed to execute pnpm ${script}: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`pnpm ${script} failed with exit code ${String(result.status)}.`);
  }
}

export function runProductionDeploymentGate(env: NodeJS.ProcessEnv = process.env): void {
  const decision = decideProductionDeploymentGate(env);

  if (!decision.run) {
    console.info(
      `Production deployment gate skipped (${decision.reason}${decision.target ? `:${decision.target}` : ""}).`,
    );
    return;
  }

  console.info("Production deployment gate started.");
  for (const script of PRODUCTION_GATE_SCRIPTS) {
    console.info(`Running ${script}...`);
    runPnpmScript(script, env);
  }
  console.info("Production deployment gate passed.");
}

function isDirectExecution(): boolean {
  const entry = process.argv[1];
  return entry !== undefined && import.meta.url === pathToFileURL(resolve(entry)).href;
}

if (isDirectExecution()) {
  try {
    runProductionDeploymentGate();
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : "Production deployment gate failed.");
    process.exitCode = 1;
  }
}
