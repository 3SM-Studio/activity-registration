import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const REQUIRED_EVIDENCE = ["THIRD_PARTY_NOTICES.md", "docs/THIRD_PARTY_LICENSE_AUDIT.md"];

for (const file of REQUIRED_EVIDENCE) {
  if (!existsSync(join(ROOT, file))) {
    console.error(`ERROR: required third-party license evidence is missing: ${file}`);
    process.exit(1);
  }
}

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

const reviewedExceptions = [
  {
    license: "CC-BY-4.0",
    packagePattern: /^caniuse-lite$/,
    versions: new Set(["1.0.30001809"]),
  },
  {
    license: "LGPL-3.0-or-later",
    packagePattern: /^@img\/sharp-libvips-[a-z0-9-]+$/,
    versions: new Set(["1.3.2"]),
  },
  {
    license: "MPL-2.0",
    packagePattern: /^axe-core$/,
    versions: new Set(["4.13.0"]),
  },
  {
    license: "MPL-2.0",
    packagePattern: /^lightningcss$/,
    versions: new Set(["1.32.0", "1.33.0"]),
  },
  {
    license: "MPL-2.0",
    packagePattern: /^lightningcss-[a-z0-9-]+$/,
    versions: new Set(["1.32.0", "1.33.0"]),
  },
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

function packageName(packageInfo) {
  const hasName =
    packageInfo && typeof packageInfo === "object" && typeof packageInfo.name === "string";
  return hasName ? packageInfo.name : "unknown-package";
}

function packageVersions(packageInfo) {
  if (!packageInfo || typeof packageInfo !== "object") {
    return [];
  }

  if (Array.isArray(packageInfo.versions)) {
    return packageInfo.versions.filter((version) => typeof version === "string");
  }

  return typeof packageInfo.version === "string" ? [packageInfo.version] : [];
}

function packageLabel(packageInfo) {
  if (!packageInfo || typeof packageInfo !== "object") {
    return String(packageInfo);
  }

  const name = packageName(packageInfo);
  const versions = packageVersions(packageInfo);
  const versionLabel = versions.length > 0 ? versions.join("|") : "unknown-version";
  const paths = Array.isArray(packageInfo.paths)
    ? packageInfo.paths.filter((path) => typeof path === "string")
    : [];
  const pathLabel = paths.length > 0 ? ` [${paths.join(", ")}]` : "";

  return `${name}@${versionLabel}${pathLabel}`;
}

function isReviewedException(license, packageInfo) {
  const name = packageName(packageInfo);
  const versions = packageVersions(packageInfo);
  if (versions.length === 0) {
    return false;
  }

  return reviewedExceptions.some(
    (exception) =>
      exception.license === license &&
      exception.packagePattern.test(name) &&
      versions.every((version) => exception.versions.has(version)),
  );
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
const reviewed = [];
for (const group of groups) {
  if (isAllowedLicenseExpression(group.license)) {
    continue;
  }

  const unreviewedPackages = group.packages.filter(
    (packageInfo) => !isReviewedException(group.license, packageInfo),
  );

  if (group.packages.length === 0 || unreviewedPackages.length > 0) {
    failures.push({
      ...group,
      packages: unreviewedPackages.length > 0 ? unreviewedPackages : group.packages,
    });
  } else {
    reviewed.push(group);
  }
}

if (reviewed.length > 0) {
  console.log("Reviewed package-scoped license exceptions:");
  for (const group of reviewed) {
    console.log(`- ${group.license}: ${group.packages.map(packageLabel).join(", ")}`);
  }
}

if (failures.length > 0) {
  console.error("ERROR: dependency license review required:");
  for (const group of failures) {
    console.error(`- ${group.license}: ${group.packages.map(packageLabel).join(", ")}`);
  }
  console.error(
    "Review the exact package, license and version before changing the reviewed exceptions or compliance evidence.",
  );
  process.exit(1);
}

console.log("Dependency license gate passed.");
