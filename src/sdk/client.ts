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

export async function sdkGetUser(): Promise<UserInfo | null> {
  try {
    return await getUserInfo();
  } catch {
    return null;
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
  try {
    const call = () => getToken(ONEDRIVE, { interactive });
    const res = interactive
      ? await withTimeout(call, INTERACTIVE_TIMEOUT_MS)
      : await call();
    return res?.token ?? null;
  } catch {
    return null;
  }
}

export async function sdkClearOneDrive(): Promise<void> {
  try {
    await clearToken(ONEDRIVE);
  } catch {
    /* ignore */
  }
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
