// Build stamp injected at build time (see vite.config.ts `define`). Lets the
// running app show exactly which build is live — the build TIME is what tells
// you whether a relaunch is serving your latest deployment.
export const APP_VERSION: string = __APP_VERSION__;
export const BUILD_TIME: string = __BUILD_TIME__;
export const GIT_SHA: string = __GIT_SHA__;

/** Compact, unambiguous (UTC): "2026-08-24 18:20 UTC". */
export function formatBuildTime(iso: string = BUILD_TIME): string {
  return iso.replace('T', ' ').replace(/:\d{2}(?:\.\d+)?Z$/, ' UTC');
}

/** e.g. "v1.0.0 · 2026-08-24 18:20 UTC · a16f1cf". */
export function buildLabel(): string {
  return `v${APP_VERSION} · ${formatBuildTime()} · ${GIT_SHA}`;
}

/** Short tag for tight spots: "v1.0.0·a16f1cf". */
export function buildTag(): string {
  return `v${APP_VERSION}·${GIT_SHA}`;
}
