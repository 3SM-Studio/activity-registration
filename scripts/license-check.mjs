import { spawnSync } from "node:child_process";

const pnpmCli = process.env.npm_execpath;
if (!pnpmCli) {
  console.error("ERROR: npm_execpath is missing; run this check through pnpm.");
  process.exit(1);
}

const result = spawnSync(process.execPath, [pnpmCli, "licenses", "list", "--json", "--long"], {
  encoding: "utf8",
  maxBuffer: 32 * 1024 * 1024,
  env: process.env,
});

if (result.error) {
  console.error(`ERROR: failed to execute pnpm license inventory: ${result.error.message}`);
  process.exit(1);
}

if (result.status !== 0) {
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  console.error(`ERROR: pnpm licenses list exited with status ${String(result.status)}.`);
  process.exit(1);
}

let report;
try {
  report = JSON.parse(result.stdout);
} catch {
  console.error("ERROR: pnpm licenses list did not return valid JSON.");
  process.exit(1);
}

if (!report || Array.isArray(report) || typeof report !== "object") {
  console.error("ERROR: unsupported pnpm license report shape.");
  process.exit(1);
}

const permissiveLicenses = new Set([
  "0BSD",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "BlueOak-1.0.0",
  "CC0-1.0",
  "ISC",
  "MIT",
  "MIT-0",
  "Python-2.0",
  "Unlicense",
  "Unicode-3.0",
  "Unicode-DFS-2016",
  "Zlib",
]);

const reviewRequiredFragments = [
  "AGPL",
  "BUSL",
  "CC-BY-NC",
  "Commons-Clause",
  "EUPL",
  "GPL",
  "LGPL",
  "MPL",
  "OSL",
  "SSPL",
  "UNLICENSED",
  "UNKNOWN",
];

function cleanExpression(expression) {
  return expression.replaceAll("(", "").replaceAll(")", "").replaceAll(/\s+/g, " ").trim();
}

function isAllowedLicenseExpression(expression) {
  const normalized = cleanExpression(expression);
  if (permissiveLicenses.has(normalized)) {
    return true;
  }

  if (/\sOR\s/i.test(normalized)) {
    return normalized
      .split(/\s+OR\s+/i)
      .map((part) => part.trim())
      .some((part) => permissiveLicenses.has(part));
  }

  if (/\sAND\s/i.test(normalized)) {
    return normalized
      .split(/\s+AND\s+/i)
      .map((part) => part.trim())
      .every((part) => permissiveLicenses.has(part));
  }

  return false;
}

function packageLabel(packageInfo) {
  if (!packageInfo || typeof packageInfo !== "object") {
    return String(packageInfo);
  }

  const name = typeof packageInfo.name === "string" ? packageInfo.name : "unknown-package";
  const version = typeof packageInfo.version === "string" ? packageInfo.version : "unknown-version";
  return `${name}@${version}`;
}

const groups = Object.entries(report)
  .map(([license, packages]) => ({
    license,
    packages: Array.isArray(packages) ? packages : [],
  }))
  .sort((left, right) => left.license.localeCompare(right.license));

console.log("Installed dependency license inventory:");
for (const group of groups) {
  console.log(`- ${group.license}: ${group.packages.length}`);
}

const failures = [];
for (const group of groups) {
  const upper = group.license.toUpperCase();
  const explicitlyReviewRequired = reviewRequiredFragments.some((fragment) =>
    upper.includes(fragment.toUpperCase()),
  );

  if (explicitlyReviewRequired || !isAllowedLicenseExpression(group.license)) {
    failures.push(group);
  }
}

if (failures.length > 0) {
  console.error("ERROR: dependency license review required:");
  for (const group of failures) {
    console.error(`- ${group.license}: ${group.packages.map(packageLabel).join(", ")}`);
  }
  console.error(
    "Review the exact package(s) before changing the allowlist or docs/THIRD_PARTY_LICENSE_AUDIT.md.",
  );
  process.exit(1);
}

console.log("Dependency license gate passed.");
