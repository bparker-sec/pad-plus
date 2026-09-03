# Changelog

All notable changes to **Pad+** are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/), and the project adheres to
[Semantic Versioning](https://semver.org/). `npm run release` moves the
**Unreleased** section into a dated, tagged version below.

## [Unreleased]

## [1.1.2] - 2026-09-03

### Changed

- Repository renamed to `bparker-sec/pad-plus`; in-app links (Help ▸ Report a
  bug / Source, and the License dialog) now point at it.

## [1.1.1] - 2026-09-03

### Added

- **Help menu** — a Help dialog (overview + keyboard shortcuts) and a "Report a
  bug" link that opens a prefilled GitHub issue.
- **About & License** dialog (View ▸ About & License, and Help) showing the
  version/build, the GPLv3 notice, and source/changelog/bug links.

### Changed

- Removed remaining "Notepad++" references from the app, docs, and metadata.

## [1.1.0] - 2026-08-29

### Added

- Line Operations (sort, dedupe, trim, join, case) — Edit menu.
- Line bookmarks (toggle / next / prev / clear) — Search menu.
- Function List outline panel — View menu.
- File Compare (side-by-side diff of two open tabs) — Tools menu.
- Find in Files across open tabs or recursively over OneDrive — Search menu.
- Named Save/Load sessions — File menu.
- Encoding conversion on save: UTF-16 LE/BE and Windows-1252.
- Smarter Save-As filetype suggestion with a "Save as type" selector.
- In-app diagnostics: error boundary, captured-log panel, and a boot guard.
- New Pad+ notepad-and-pencil app icon (favicon, PWA, brand mark) + 192/512 PNG PWA icons.
- Unsaved-changes warning on window close.
- Accessibility pass on dialogs and menus.
- Tooling: GPLv3 license, ESLint + Prettier, CHANGELOG + tagged releases, Playwright smoke test.

### Changed

- Established the **Pad+** product name and branding.
- Builds stamp the commit SHA into source zips (no more `nogit`).
- UTF-16 files now round-trip instead of downgrading to UTF-8 on save.

### Removed

- Redundant OneDrive Diagnostics link in the View menu (still reachable via `?diag`).

## [1.0.3] - 2026-08-27

- In-app error boundary, log capture, and boot guard.

## [1.0.2] - 2026-08-27

- Line Operations, Bookmarks, Function List, Encoding conversion, Named Sessions,
  File Compare, Find in Files.

## [1.0.1] - 2026-08-27

- Build tooling: commit SHA baked into source zips; one-command `npm run release`.

## [1.0.0] - 2026-08

- Initial release: Monaco editor core, multi-tab editing, OneDrive storage via
  Microsoft Graph, installable PWA, and six responsive layouts driven by
  container size.
