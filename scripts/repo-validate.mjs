import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const errors = [];
const warnings = [];

const REQUIRED_FILES = [
  "README.md",
  "package.json",
  "tsconfig.json",
  "next.config.ts",
  ".github/workflows/ci.yml",
  ".github/dependabot.yml",
  "docs/PROJECT_BLUEPRINT.md",
  "docs/DECISIONS.md",
  "docs/ARCHITECTURE.md",
  "docs/DATA_MODEL.md",
  "docs/SECURITY.md",
  "docs/TESTING.md",
  "docs/DEPLOYMENT.md",
  "docs/RELEASE_CHECKLIST.md",
  "docs/DEPENDENCIES.md",
  "docs/IMPLEMENTATION_STATUS.md",
  "docs/OPERATIONS.md",
];

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".mjs", ".js", ".jsx"]);
const TEXT_EXTENSIONS = new Set([
  ...SOURCE_EXTENSIONS,
  ".md",
  ".json",
  ".yml",
  ".yaml",
  ".css",
  ".example",
]);

const IGNORED_DIRS = new Set([
  ".git",
  ".next",
  "node_modules",
  "coverage",
  "playwright-report",
  "test-results",
]);

function extensionOf(path) {
  const name = path.split("/").at(-1) ?? "";
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot);
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) {
      continue;
    }

    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function isExactStableVersion(value) {
  return /^\d+\.\d+\.\d+$/.test(value);
}

for (const file of REQUIRED_FILES) {
  if (!existsSync(join(ROOT, file))) {
    errors.push(`Missing required file: ${file}`);
  }
}

const packageJson = JSON.parse(await readFile(join(ROOT, "package.json"), "utf8"));
const packageGroups = ["dependencies", "devDependencies"];
for (const group of packageGroups) {
  for (const [name, version] of Object.entries(packageJson[group] ?? {})) {
    if (typeof version !== "string" || !isExactStableVersion(version)) {
      errors.push(
        `${group}.${name} must use an exact stable x.y.z version, got ${String(version)}`,
      );
    }
  }
}

if (!/^pnpm@\d+\.\d+\.\d+$/.test(packageJson.packageManager ?? "")) {
  errors.push("packageManager must pin an exact pnpm version.");
}

if (packageJson.engines?.node !== ">=24.19.0 <25") {
  errors.push('engines.node must be ">=24.19.0 <25" for the selected Node 24 LTS line.');
}

if (packageJson.dependencies?.next !== packageJson.devDependencies?.["eslint-config-next"]) {
  errors.push("next and eslint-config-next versions must match.");
}

if (packageJson.scripts?.typecheck !== "next typegen && tsc --noEmit") {
  errors.push('typecheck must run "next typegen && tsc --noEmit".');
}

const allFiles = await collectFiles(ROOT);
for (const file of allFiles) {
  const rel = relative(ROOT, file).replaceAll("\\", "/");
  const base = rel.split("/").at(-1) ?? "";

  if (/\.pem$|\.p12$|\.pfx$|service-account.*\.json$/i.test(base)) {
    errors.push(`Potential credential file must not be committed: ${rel}`);
  }

  if (!TEXT_EXTENSIONS.has(extensionOf(rel)) && !base.startsWith(".env")) {
    continue;
  }

  const text = await readFile(file, "utf8");

  if (/-----BEGIN (?:RSA |EC |)PRIVATE KEY-----/.test(text)) {
    errors.push(`Private key material detected in ${rel}`);
  }

  if (SOURCE_EXTENSIONS.has(extensionOf(rel)) && rel !== "scripts/repo-validate.mjs") {
    if (/GOOGLE_PRIVATE_KEY/.test(text)) {
      errors.push(`Long-lived Google private key configuration detected in ${rel}`);
    }

    if (/valueInputOption=USER_ENTERED|valueInputOption:\s*["']USER_ENTERED["']/.test(text)) {
      errors.push(`USER_ENTERED write mode detected in ${rel}; registration writes must use RAW.`);
    }
    if (/\bas\s+any\b|:\s*any\b|<any>/.test(text)) {
      errors.push(`Explicit any detected in ${rel}`);
    }

    const isAllowedGoogleLayer =
      rel.startsWith("src/infrastructure/google/") || rel.startsWith("scripts/");
    if (
      !isAllowedGoogleLayer &&
      /google-auth-library|sheets\.googleapis\.com|@vercel\/oidc/.test(text)
    ) {
      errors.push(`Google/Vercel infrastructure dependency leaked outside infrastructure: ${rel}`);
    }
  }
}

const gitignore = await readFile(join(ROOT, ".gitignore"), "utf8");
if (!gitignore.split(/\r?\n/).includes("next-env.d.ts")) {
  errors.push(".gitignore must ignore generated next-env.d.ts.");
}
if (existsSync(join(ROOT, "next-env.d.ts"))) {
  warnings.push("Generated next-env.d.ts exists locally; it must remain untracked.");
}

const ci = await readFile(join(ROOT, ".github/workflows/ci.yml"), "utf8");
if (!ci.includes("pnpm install --frozen-lockfile")) {
  errors.push("CI must install with --frozen-lockfile.");
}
if (!ci.includes("pnpm check")) {
  errors.push("CI must run pnpm check.");
}
if (!ci.includes("pnpm test:e2e")) {
  errors.push("CI must run critical Playwright E2E tests.");
}
if (!ci.includes("actions/checkout@v7")) {
  errors.push("CI must use the selected current actions/checkout v7 line.");
}
if (!ci.includes("actions/setup-node@v7")) {
  errors.push("CI must use the selected current actions/setup-node v7 line.");
}
if (!ci.includes("pnpm/action-setup@v6")) {
  errors.push("CI must use the selected current pnpm/action-setup v6 line.");
}

if (!existsSync(join(ROOT, "pnpm-lock.yaml"))) {
  const message =
    "pnpm-lock.yaml is missing. Generate it before CI/release with the pinned pnpm version.";
  if (process.env.ALLOW_MISSING_LOCKFILE === "1") {
    warnings.push(message);
  } else {
    errors.push(message);
  }
}

if (warnings.length > 0) {
  for (const warning of warnings) {
    console.warn(`WARN: ${warning}`);
  }
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`ERROR: ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log("Repository contract validation passed.");
}
