// Thin, crash-safe wrappers around ai-publish-sdk. Every host interaction goes
// through here; each wrapper degrades to a safe fallback if the SDK/host is
// unavailable (e.g. when the built app is opened outside a host during review).
import {
  getUserInfo,
  getToken,
  clearToken,
  getBrandingAssets,
  trackEvent,
  withTimeout,
  type UserInfo,
  type BrandingAssets,
  type TrackEventDetails,
  type TrackEventParams,
} from 'ai-publish-sdk';

export type { UserInfo, BrandingAssets };

const ONEDRIVE = 'onedrive';
const INTERACTIVE_TIMEOUT_MS = 120_000;
const HOST_PROBE_TIMEOUT_MS = 4_000;

/**
 * Whether this document is running inside a frame. Informational only — a host
 * may still answer from the same top-level window (e.g. an injected responder),
 * so this is NOT used to gate OneDrive; `sdkProbeHost` is the real signal.
 */
export function isEmbedded(): boolean {
  try {
    return typeof window !== 'undefined' && window.parent !== window;
  } catch {
    // Cross-origin access to window.parent throws — that means we ARE framed.
    return true;
  }
}

/**
 * True when a host is actually answering RPC. Determined by probing (not by
 * frame topology), so it works whether the host is a parent frame or a responder
 * injected into a top-level window. A missing/silent host waits out the short
 * probe timeout and returns false.
 */
export async function sdkProbeHost(): Promise<boolean> {
  try {
    await withTimeout(() => getUserInfo(), HOST_PROBE_TIMEOUT_MS);
    return true;
  } catch {
    return false;
  }
}

export async function sdkGetUser(): Promise<UserInfo | null> {
  try {
    return await getUserInfo();
  } catch {
    return null;
  }
}

export type OneDriveTokenResult =
  | { ok: true; token: string }
  | { ok: false; reason: 'no_host' | 'no_token' | 'timeout' | 'error'; detail?: string };

/**
 * Acquire a OneDrive OAuth token via the host, reporting WHY it failed so the UI
 * can show an accurate message instead of a generic "canceled".
 */
export async function sdkGetOneDriveTokenResult(
  interactive: boolean,
): Promise<OneDriveTokenResult> {
  try {
    const call = () => getToken(ONEDRIVE, { interactive });
    const res = interactive
      ? await withTimeout(call, INTERACTIVE_TIMEOUT_MS)
      : await call();
    if (res?.token) return { ok: true, token: res.token };
    return { ok: false, reason: 'no_token' };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      reason: /timeout/i.test(detail) ? 'timeout' : 'error',
      detail,
    };
  }
}

/**
 * Acquire a OneDrive OAuth token via the host. `interactive` shows the OAuth
 * flow (used for explicit sign-in / first file access); non-interactive attempts
 * a silent token and returns null if not yet authorized.
 */
export async function sdkGetOneDriveToken(
  interactive: boolean,
): Promise<string | null> {
  const res = await sdkGetOneDriveTokenResult(interactive);
  return res.ok ? res.token : null;
}

/**
 * Clear the host-managed OneDrive session. Returns true only when the host
 * confirms the clear; returns false on failure (never throws). Use this — not a
 * local-cache wipe — as the authoritative host session reset.
 */
export async function sdkClearOneDriveResult(): Promise<boolean> {
  try {
    await clearToken(ONEDRIVE);
    return true;
  } catch {
    return false;
  }
}

/** @deprecated Prefer sdkClearOneDriveResult, which reports success/failure. */
export async function sdkClearOneDrive(): Promise<void> {
  await sdkClearOneDriveResult();
}

export async function sdkGetBranding(): Promise<BrandingAssets | null> {
  try {
    return await getBrandingAssets();
  } catch {
    return null;
  }
}

/** Fire-and-forget analytics. Never throws (or rejects) into the UI. */
export function sdkTrack(
  eventName: string,
  additionalDetails?: TrackEventDetails,
): void {
  try {
    const params = { eventName, additionalDetails } as unknown as TrackEventParams;
    // trackEvent returns a promise that rejects on RPC timeout when no host is
    // present — swallow both sync throws and async rejections.
    Promise.resolve(trackEvent(params)).catch(() => {});
  } catch {
    /* ignore */
  }
}
