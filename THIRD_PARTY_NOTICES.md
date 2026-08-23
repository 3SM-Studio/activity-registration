# Third-party notices

This repository is source-visible under the project `LICENSE`. That project license does not replace, sublicense or remove the licenses of third-party software and data used by the application and its toolchain.

Verified dependency inventory and rationale are documented in `docs/THIRD_PARTY_LICENSE_AUDIT.md`. The automated gate is `pnpm licenses:check`.

## caniuse-lite

- Package: `caniuse-lite`
- Audited version: `1.0.30001809`
- License: Creative Commons Attribution 4.0 International (`CC-BY-4.0`)
- Data source attribution requested by upstream: `caniuse.com`
- Upstream: https://github.com/browserslist/caniuse-lite
- License information: https://github.com/browserslist/caniuse-lite#license

The project does not claim ownership of the Can I Use data.

## axe-core

- Package: `axe-core`
- Audited version: `4.13.0`
- License: Mozilla Public License 2.0 (`MPL-2.0`)
- Upstream: https://github.com/dequelabs/axe-core
- License: https://www.mozilla.org/MPL/2.0/

In this dependency tree `axe-core` is transitive development tooling through `eslint-plugin-jsx-a11y` / `eslint-config-next`. The project does not relicense axe-core as project source code.

## Lightning CSS

- Packages: `lightningcss` and platform-specific `lightningcss-*` binaries
- Audited versions: `1.32.0`, `1.33.0`
- License: Mozilla Public License 2.0 (`MPL-2.0`)
- Upstream: https://github.com/parcel-bundler/lightningcss
- License: https://www.mozilla.org/MPL/2.0/

The audited tree uses Lightning CSS through Tailwind build tooling and Vite/Vitest. The project does not relicense Lightning CSS as project source code.

## sharp / prebuilt libvips bundle

- Reviewed package family: `@img/sharp-libvips-*`
- Audited version: `1.3.2`
- License reported by the installed npm package: `LGPL-3.0-or-later`
- Dependency path: Next.js -> optional `sharp` -> platform package -> prebuilt libvips bundle
- sharp-libvips packaging project: https://github.com/lovell/sharp-libvips
- Upstream third-party notices: https://github.com/lovell/sharp-libvips/blob/main/THIRD-PARTY-NOTICES.md
- GNU LGPL 3.0: https://www.gnu.org/licenses/lgpl-3.0.html

The current product is operated as a hosted web service and does not offer customers a downloadable server bundle or container containing this library. This package is not modified by this project. If the distribution model changes so that server binaries, containers, installers or other copies containing libvips are conveyed to third parties, the LGPL distribution obligations must be reviewed again before release.

## Project-owned or client-provided assets

Third-party notices do not establish ownership or usage rights for project branding. Asset provenance is audited separately in `docs/THIRD_PARTY_LICENSE_AUDIT.md`. In particular, the current Pozytywka logo remains subject to explicit provenance/authorization confirmation until documentary evidence is available.
