# Notepad++ Web

A fast, client-side **code & text editor** modeled on Notepad++, delivered through
the **AI app** platform and built to run in the **Island** browser. It is a pure
static SPA — installable as a **full-screen PWA** to replace a desktop Notepad++
install — that stores every file in **Microsoft OneDrive** (never the local
filesystem).

![status](https://img.shields.io/badge/build-static%20SPA-2e8b57)

---

## Highlights

- **Monaco editor core** — syntax highlighting for 50+ languages, regex
  Find & Replace, minimap, split view, go-to-line, multi-cursor.
- **Multi-tab editing** with dirty tracking and per-buffer language / encoding / EOL.
- **OneDrive-only storage** via Microsoft Graph — Open, Save, Save As, browse
  folders. No local-filesystem access anywhere.
- **Installable PWA** — `display: standalone` (+ `window-controls-overlay`),
  offline app shell, instant relaunch.
- **Session persistence** — open tabs & unsaved buffers survive relaunch
  (IndexedDB app-state, not the filesystem).
- **One build, six layouts** — full page, Chrome side panel, and four widget
  profiles, switched purely by container dimensions.
- **Host I/O only through `ai-publish-sdk`** — OneDrive auth, user identity,
  branding, analytics. No custom postMessage, no mock data.

## Requirements satisfied

| Requirement | How |
| --- | --- |
| Pure static SPA, CDN-deployable, no runtime compute | Vite static build → `dist/` (HTML/JS/CSS/assets only) |
| Multi-platform layout switch by container size | `usePlatform()` + `classify()` → 6 distinct layout components |
| Widget "IS the card" | `WidgetCard` root = exactly `border-radius:24px; overflow:hidden`, no wrapper/`flex`/`bg-`/`p-` outside it |
| Side panel ≥ 360×900 | Narrow, vertically-scrolling `SidePanel` layout |
| All host comms via `ai-publish-sdk` | `src/sdk/client.ts` wraps `getToken` / `getUserInfo` / `getBrandingAssets` / `trackEvent` |
| Files default to OneDrive, no local FS | `src/onedrive/*` (Graph REST); new buffers live in memory / IndexedDB |
| `package-lock.json` shipped | Generated with `npm install --package-lock-only --ignore-scripts --no-audit` |

## Build

```bash
npm ci
npm run build      # tsc -b && vite build  →  dist/
```

The `dist/` folder is the entire deployable: copy it to any static host / CDN on
a per-app subdomain. No server, SSR, edge runtime, or API routes.

Other scripts:

```bash
npm run dev        # local dev server
npm run preview    # serve the production build locally
npm test           # vitest unit tests (42 tests)
```

## OneDrive integration

Authentication is brokered by the host through the SDK; file I/O is standard
Microsoft Graph called directly from the browser with the returned token:

```
getToken('onedrive', { interactive: true })  →  Bearer token
      │
      ├─ GET  /me/drive/root/children            list / browse
      ├─ GET  /me/drive/items/{id}/content       open
      ├─ PUT  /me/drive/items/{id}/content       save (existing)
      └─ PUT  /me/drive/root:/{path}:/content    save as / new  (> 4 MB → upload session)
```

No local file is ever read or written. Unsaved documents exist only in memory
(and IndexedDB session state) until saved to OneDrive.

## Platform detection

`classify(width, height)` (`src/platform/profiles.ts`) maps the container size to:

| Context | Trigger | Layout |
| --- | --- | --- |
| Widget · Landscape | ~344×165 | compact tabs + single editor |
| Widget · Portrait | ~388×510 | vertical stack + drill-down nav |
| Widget · Expanded | ~720×510 | sidebar + editor |
| Widget · Extra-Large | ~1100×510 | menu bar + sidebar + editor + minimap |
| Side panel | ≤500 wide, ≥620 tall | narrow single column |
| Full page / installed PWA | everything else | full Notepad++ shell |

## Project structure

```
src/
  platform/   profiles.ts, usePlatform.ts        (+ tests)
  sdk/        client.ts                           ai-publish-sdk wrappers
  onedrive/   graph.ts (+ tests), auth.ts, OneDrivePicker.tsx
  editor/     documents.ts (+ tests), languages.ts (+ tests),
              MonacoPane.tsx, EditorHost.tsx (lazy), models.ts, monacoSetup.ts,
              persistence.ts, editorApi.ts
  state/      AppProvider.tsx, useShortcuts.ts
  ui/         MenuBar, Toolbar, TabBar, StatusBar, DocSidebar, SettingsPanel,
              Menu, AccountButton, Toast, Overlays, Brand, icons
  layouts/    FullPage.tsx, SidePanel.tsx,
              widget/{WidgetCard,Landscape,Portrait,Expanded,ExtraLarge}.tsx
  App.tsx, main.tsx, index.css
public/       favicon.svg, icons/app-icon.svg
docs/superpowers/specs/2026-08-20-notepad-web-design.md
```

Monaco (~3.3 MB) is code-split into its own chunk and lazy-loaded, so the shell
paints from a ~190 KB entry chunk before the editor streams in.

## Notes

- Branding (icon, name styling) is **original** and does not reproduce the
  Notepad++ trademarked mascot.
- Tested with Node 24 / npm 11.
