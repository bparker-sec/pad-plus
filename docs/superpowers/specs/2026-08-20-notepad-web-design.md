# Pad+ — Design Spec

**Date:** 2026-08-20
**Status:** Approved
**Goal:** A pure client-side web app that reproduces a classic desktop
code-editing experience, is **installable as a full-screen PWA to replace a
local desktop editor install**, stores all files in **Microsoft OneDrive** (never the local
filesystem), communicates with its host exclusively through `ai-publish-sdk`, and
is delivered as a static bundle for upload to the **Island** browser environment.

---

## 1. Non-negotiable constraints

- **Pure static client-side SPA.** `npm ci && npm run build` produces a static
  `dist/` (HTML/JS/CSS/assets only). No server process, SSR, edge runtime, API
  routes, or backend. All logic runs in the browser after asset load.
- **Deployable to a static CDN** on a per-app subdomain with no runtime compute.
- **Multi-platform layout switch** driven by container dimensions (see §4).
- **Host communication only via `ai-publish-sdk`** — no mock data, no custom
  postMessage handling.
- **No local-filesystem access.** Open/Save default to OneDrive. New/unsaved
  buffers live in browser memory (and IndexedDB app-state), never on disk.
- **`package-lock.json`** generated with
  `npm install --package-lock-only --ignore-scripts --no-audit` and shipped.
- Runs in the **Island** (Chromium-based) browser.

## 2. Stack

- **React + TypeScript + Vite + Tailwind CSS.** Vite emits a pure static bundle.
- **Monaco Editor** (VS Code engine), self-hosted (workers bundled as static
  assets via Vite `?worker` imports — never from a CDN). Lazy-loaded / code-split
  so the shell + correct layout paint before the ~4MB editor streams in.
- **vite-plugin-pwa** (generateSW) for the manifest + service worker (static
  output) → installability, instant relaunch, offline app shell.
- **Vitest** for unit tests over pure logic.

## 3. SDK usage map (`ai-publish-sdk`)

| Need                          | SDK method                                    |
| ----------------------------- | --------------------------------------------- |
| OneDrive OAuth token          | `getToken('onedrive', { interactive: true })` |
| Sign out of OneDrive          | `clearToken('onedrive')`                      |
| Current user identity         | `getUserInfo()`                               |
| White-label accent (optional) | `getBrandingAssets()`                         |
| Analytics                     | `trackEvent(...)`                             |

All wrapped in `src/sdk/client.ts` with safe fallbacks when the SDK is absent
(e.g. running the built app outside a host during local verification).

## 4. Platform detection & layouts

`usePlatform()` measures the **root element** with `ResizeObserver` and classifies
on every resize. Priority is the **Full-page / installed-PWA** experience; the
widget + side-panel contexts are required adaptive fallbacks.

Classification (pure function `classify(width, height)` in `platform/profiles.ts`):

- **Widget** when `height <= 520 && width <= 1150` → nearest of:
  - **Landscape 344×165** — compact tab strip + single minimal editor (minimap/split off).
  - **Portrait 388×510** — vertical stack with drill-down sub-pages (Files ▸ Editor ▸ Find ▸ Settings).
  - **Expanded 720×510** — sidebar (OneDrive + tabs) beside editor.
  - **Extra-Large 1100×510** — wide multi-panel: sidebar + editor + document map.
- **Side panel** when `width <= 500 && height >= 700` — narrow single column, vertical scroll, tab dropdown.
- **Full page** otherwise — classic desktop-editor shell: menu bar, toolbar, tab bar,
  OneDrive sidebar, editor, minimap, optional split, status bar. This is also the
  layout used when the app is launched as an installed standalone PWA.

**Widget "IS the Card" rule.** In widget mode the root component carries exactly
`border-radius: 24px; overflow: hidden` with **no** outer wrapper and none of
`min-h-screen / h-screen / flex / items-center / justify-center / p-* / bg-*`
outside the card element. Those utilities appear only in full-page / side-panel modes.

## 5. Editor & document model

- **Tabs** over in-memory buffers. Buffer shape:
  `{ id, name, oneDriveItemId?, parentId?, content, savedContent, language, encoding, eol, dirty }`.
- Power tools: syntax highlighting, **Find & Replace** (Monaco's built-in widget:
  regex / case / whole-word), **minimap**, **split view** (Expanded/XL/full),
  **go-to-line**, **language selector**, **encoding + EOL** controls, word-wrap,
  line numbers, dark/light themes.
- Dirty tracking via `content !== savedContent`.
- New/unsaved buffers exist only in memory + IndexedDB until saved to OneDrive.

## 6. OneDrive integration (Microsoft Graph, client-side)

- **Auth** (`onedrive/auth.ts`): fetch token via SDK, cache in memory, refresh on
  401, `clearToken` for sign-out.
- **Graph client** (`onedrive/graph.ts`, pure URL/path builders are unit-tested):
  - List root / folder: `GET /me/drive/root/children`, `GET /me/drive/items/{id}/children`.
  - Read: `GET /me/drive/items/{id}/content`.
  - Save existing: `PUT /me/drive/items/{id}/content` (simple upload ≤4MB).
  - Save As / new: `PUT /me/drive/root:/{folderPath}/{name}:/content`.
  - Large files (>4MB): Graph **upload session** (chunked).
- **OneDrivePicker.tsx** — modal browser: navigate folders, list files, pick to
  open; and a "save to" mode for Save As.

## 7. PWA / desktop-replacement

- `manifest.webmanifest`: name, original icon set, `display: standalone`
  (`display_override: ["window-controls-overlay"]` so the menu bar can occupy the
  title-bar strip), theme/background colors.
- Service worker precaches the app shell + Monaco chunks → instant relaunch and
  offline editing (OneDrive I/O still needs network).
- **Session persistence via IndexedDB** (`editor/persistence.ts`): open tabs +
  unsaved buffers survive relaunch. IndexedDB is browser app-state, **not** the
  filesystem; OneDrive stays the only file store.
- **Original branding** — a clean, original notepad/pencil mark; no third-party
  logos or trademarked mascots.

## 8. Project structure

```
src/
  platform/   profiles.ts, usePlatform.ts, profiles.test.ts
  sdk/        client.ts
  onedrive/   graph.ts, graph.test.ts, auth.ts, OneDrivePicker.tsx
  editor/     documents.ts, documents.test.ts, useDocuments.ts,
              languages.ts, languages.test.ts, MonacoPane.tsx,
              monacoSetup.ts, persistence.ts
  ui/         MenuBar, Toolbar, TabBar, StatusBar, ThemeProvider, icons
  layouts/    FullPage, SidePanel, widget/{WidgetCard,Landscape,Portrait,Expanded,ExtraLarge}
  state/      AppProvider.tsx (shared documents/theme/onedrive/picker state)
  App.tsx, main.tsx, index.css, vite-env.d.ts
public/       manifest.webmanifest, icons/*, favicon
```

## 9. Testing & build

- **Vitest** unit tests: platform classification, Graph URL/path builders,
  document reducer, filename→language mapping.
- Build: `npm ci && npm run build` → static `dist/`.
- Lock file: `npm install --package-lock-only --ignore-scripts --no-audit`.

## 10. Deliverable

A **zip of the source project** (excludes `node_modules`, includes
`package-lock.json`) ready for Island CI to run `npm ci && npm run build` and ship
`dist/`. Build verified locally before packaging.

## 11. Trade-offs

- Monaco at 344×165 is tight → Landscape degrades to a minimal editor (acceptable;
  not the intended primary use).
- ~4MB Monaco bundle → acceptable for a CDN desktop-class app, mitigated by lazy
  loading + SW precache.
- Custom Graph picker instead of Microsoft's File Picker SDK → keeps the app
  self-contained and routes all host auth through the SDK.
