# Third-party dependency and asset audit

Date: 2026-08-23
Scope: Pozytywka Registration v4, dependency tree installed by CI on Linux and assets committed to this repository.

This document is engineering/compliance evidence, not legal advice. The project remains source-visible / All Rights Reserved under the repository `LICENSE`; third-party components retain their own licenses.

## Automated dependency inventory

The canonical check is:

```bash
pnpm licenses:check
```

It executes `pnpm licenses list --json --long` against the installed dependency tree and is part of the mandatory `pnpm check` quality gate.

CI run #530 identified the following license groups before reviewed exceptions were encoded:

- `(MIT OR CC0-1.0)`: 1
- `0BSD`: 1
- `Apache-2.0`: 34
- `BlueOak-1.0.0`: 6
- `BSD-2-Clause`: 15
- `BSD-3-Clause`: 9
- `CC-BY-4.0`: 1
- `CC0-1.0`: 2
- `ISC`: 22
- `LGPL-3.0-or-later`: 1
- `MIT`: 615
- `MPL-2.0`: 3 package groups
- `Python-2.0`: 1

There was no GPL, AGPL, SSPL, BUSL, non-commercial Creative Commons license or unknown/unlicensed group in that installed tree.

The gate is fail-closed. Common permissive licenses are allowed by license expression. Non-permissive/review-required licenses are allowed only for an explicitly reviewed package name, license and audited version. A new unrelated MPL/LGPL/CC-BY package, a license change or an unreviewed version fails CI.

## Reviewed exceptions

### caniuse-lite

Current package: `caniuse-lite@1.0.30001809`

Dependency paths include Browserslist and Next.js 16.3.0. Upstream declares the data under `CC-BY-4.0` and requests attribution that the source is `caniuse.com`. The required attribution is preserved in the repository `THIRD_PARTY_NOTICES.md`.

Decision: accepted for the current project with attribution. A version/license change requires re-review.

### axe-core

Current package: `axe-core@4.13.0`

Dependency path: `eslint-config-next` -> `eslint-plugin-jsx-a11y` -> `axe-core`. It is development/lint tooling, not application-owned source code. Upstream declares `MPL-2.0`.

MPL 2.0 is file-level copyleft. It permits a Larger Work to use separate proprietary files while requirements continue to apply to MPL-covered software and modifications. This project does not maintain modifications to axe-core.

Decision: accepted as transitive development tooling. Preserve upstream notices and re-review on version/license/distribution-model changes.

### Lightning CSS

Current packages:

- `lightningcss@1.32.0`
- `lightningcss@1.33.0`
- installed platform package `lightningcss-linux-x64-gnu` for the corresponding versions

Dependency paths:

- `@tailwindcss/node@4.3.3` -> `lightningcss@1.32.0`
- `vitest` -> `vite@8.2.1` -> `lightningcss@1.33.0`

Upstream declares `MPL-2.0`. These packages are build/test tooling in the audited dependency graph; the project does not maintain modifications to Lightning CSS.

Decision: accepted for the current toolchain. Package-scoped version pins in the license gate force re-review when the audited versions move.

### sharp / libvips

Current reviewed platform package: `@img/sharp-libvips-linux-x64@1.3.2`.

Dependency path: `next@16.3.0` -> optional `sharp@0.35.3` -> platform-specific sharp package -> `@img/sharp-libvips-linux-x64@1.3.2`.

The installed package reports `LGPL-3.0-or-later`. The sharp-libvips packaging project publishes its own third-party notices and identifies libvips plus other bundled libraries and their licenses.

The current public product is a hosted web service. It does not provide users with a downloadable server binary, container or installer containing this package. The project does not maintain modifications to libvips/sharp-libvips.

Decision: accepted for the current hosted architecture, with upstream notice/source references preserved in `THIRD_PARTY_NOTICES.md`. Treat a future downloadable server bundle, container, desktop package or other conveyance of this library as a mandatory legal/compliance re-review before release.

## react-icons hygiene finding

`react-icons@5.7.0` is currently declared as a direct dependency, but repository code search found no import/reference to `react-icons`. Therefore no icon set from that package was identified as incorporated into application source in this audit.

This is dependency hygiene rather than a license blocker. It should be removed in a normal lockfile-preserving dependency cleanup when convenient; until then its package license remains part of automated inventory.

## Asset inventory

The repository `public/` directory contains one project asset:

- `public/pozytywka-logo.webp`

The file is used as the Pozytywka brand logo in the application and transactional e-mail presentation.

### Evidence found

- Connected Google Drive contains a project folder named `01_Logo`, but the accessible folder is currently empty.
- The connected client-corrections document explicitly instructs the implementation to use the Pozytywka logo, including in the footer, and says its visual references came from materials provided for the project.
- Connected Gmail contains copies of the exact `pozytywka-logo.webp` embedded in registration e-mails generated by this application, but those messages are downstream application output, not evidence of who created the original logo or granted rights to use it.
- No accessible source file, brandbook, author declaration, assignment, license grant or client e-mail supplying the original logo was found in the searches performed on 2026-08-23.

### Asset conclusion

Engineering evidence supports that the logo is being used as the client's Pozytywka brand asset and that the client requested use of the Pozytywka logo in the project. It does **not** establish copyright authorship/ownership or an explicit license/assignment for the original artwork.

Therefore asset provenance is the one unresolved item in GitHub issue #8. Before marking the issue fully complete, retain one of the following durable records:

1. client confirmation that Pozytywka owns or is authorized to use the supplied logo and authorizes its use in this project, or
2. the original source/brand package with documented rights, or
3. another written license/assignment covering the logo.

Do not invent authorship or ownership from the fact that the logo appears in existing Pozytywka materials.

## Ongoing policy

- `pnpm licenses:check` remains part of `pnpm check`.
- Reviewed copyleft/attribution exceptions are package-scoped and version-scoped, not global license allowlisting.
- New or changed non-permissive licenses fail CI until reviewed.
- `THIRD_PARTY_NOTICES.md` must remain in the repository while reviewed exceptions are present.
- Any future distributable binary/container/installer requires a fresh assessment of bundled third-party license obligations.
- New non-code assets require provenance/usage-rights evidence before they are treated as cleared for production.
