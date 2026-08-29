# Pad+

A fast, client-side **code & text editor** for **Microsoft OneDrive**, inspired by
Notepad++ and delivered through the **AI app** platform for the **Island** browser.
It is a pure static SPA — installable as a **full-screen PWA** — that stores every
file in OneDrive (never the local filesystem).

> **Pad+ is an independent project inspired by Notepad++.** It is not affiliated
> with, endorsed by, or derived from the Notepad++ source code, and "Notepad++"
> and "OneDrive" are trademarks of their respective owners. See
> [Licensing & attribution](#licensing--attribution).

![build](https://img.shields.io/badge/build-static%20SPA-2e8b57)
![license](https://img.shields.io/badge/license-GPLv3-2e8b57)

---

## Highlights

- **Monaco editor core** — syntax highlighting, regex Find & Replace, minimap,
  split view, go-to-line, multi-cursor, column select, code folding.
- **Multi-tab editing** with dirty tracking and per-buffer language / encoding / EOL.
- **Editor power tools** — Line Operations (sort, dedupe, trim, join, case),
  Bookmarks, a Function List outline, File Compare (side-by-side diff), and
  Find in Files (across open tabs or recursively over OneDrive).
- **Named Sessions** — save/restore a set of open tabs by name.
- **Encoding conversion on save** — UTF-8 / UTF-8-BOM / UTF-16 LE·BE / Windows-1252.
- **OneDrive-only storage** via Microsoft Graph — Open, Save, Save As, browse
  folders. No local-filesystem access anywhere.
- **Installable PWA** — `display: standalone` (+ `window-controls-overlay`),
  offline app shell, instant relaunch.
- **Session persistence** — open tabs & unsaved buffers survive relaunch
  (IndexedDB app-state, not the filesystem).
- **In-app diagnostics** — an error boundary + captured-log panel and a boot
  guard, so problems surface on-screen (no devtools needed in the host).
- **One build, six layouts** — full page, Chrome side panel, and four widget
  profiles, switched purely by container dimensions.
- **Host I/O only through `ai-publish-sdk`** — OneDrive auth, user identity,
  branding, analytics.

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
npm test           # vitest unit tests
npm run typecheck  # tsc project references
npm run lint       # eslint
npm run format     # prettier --write
npm run release    # bump version, commit, tag, and build the source zip
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

## Troubleshooting OneDrive

If **Connect OneDrive** fails with "isn't connected for this app", the host
(Island) has no active OneDrive OAuth provider for the tenant/app. Add `?diag`
to the URL (or open the Settings panel in compact layouts) to run diagnostics and
see exactly which stage fails, then follow Island's setup guide:
<https://documentation.island.io/docs/configure-and-manage-the-microsoft-onedrive-integration>

## Licensing & attribution

- **Pad+ is licensed under the GNU General Public License v3.0** — see
  [`LICENSE`](./LICENSE). You may use, study, share, and modify it under those terms.
- Pad+ is **original work** built with React and Microsoft's Monaco editor (MIT).
  It is **inspired by** Notepad++ but contains **no Notepad++ source code** and does
  not reproduce its name in branding or its trademarked chameleon mascot.
- "Notepad++" is a trademark of its author; "Microsoft" and "OneDrive" are
  trademarks of Microsoft. Pad+ is not affiliated with or endorsed by either.

Tested with Node 22 / npm.
