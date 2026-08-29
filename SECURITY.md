# Security

Pad+ is a client-side static SPA. It has **no backend of its own** and stores no
secrets at rest. This document records the security model and the pre-GA review.

## Data & trust model

- **OneDrive OAuth tokens** are brokered by the host (`ai-publish-sdk`), held only
  **in memory** for the session (`src/onedrive/session.ts`), refreshed on `401`,
  and cleared on sign-out. Tokens are **never written to disk/IndexedDB/localStorage**
  and **never logged** — see redaction below.
- **File contents** live in memory and, for the open session, in **IndexedDB**
  (browser app-state, not the filesystem). OneDrive is the only durable store.
- **Microsoft Graph** is called directly from the browser with the Bearer token;
  no third party sees requests or data.
- **No credentials, passwords, or keys** are entered into or stored by Pad+.

## Pre-GA review findings

- **No token logging.** Diagnostics report only token *presence/length*
  (`src/diagnostics/checks.ts`), never the value. The in-app log buffer
  (`src/diagnostics/logbuffer.ts`) additionally **redacts** anything token-shaped
  (Bearer tokens, JWTs, `*_token` assignments) before storing to localStorage, so
  the recovery/diagnostics screens can never surface a token even if some future
  code path logs one. Covered by `logbuffer.test.ts`.
- **No secrets in the bundle.** All auth material is obtained at runtime from the
  host; the static build contains none.
- **Self-hosted editor workers.** Monaco language/editor workers are bundled as
  static assets (no CDN), so a strict host Content-Security-Policy can allow them
  without `unsafe-eval` exceptions for third-party origins.
- **Analytics** (`trackEvent`) sends event names only — no file content or PII.

## Reporting a vulnerability

Please report suspected vulnerabilities privately to the repository owner rather
than opening a public issue. We aim to acknowledge reports within a few business
days.
