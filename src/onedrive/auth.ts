// OneDrive token manager. Caches the access token in memory and refreshes on
// demand. Interactive acquisition is user-initiated (sign-in / first file op).
import { sdkGetOneDriveToken, sdkClearOneDrive } from '../sdk/client';
import type { Authable } from './graph';

let cachedToken: string | null = null;

export const oneDriveAuth: Authable = {
  async getToken(force = false): Promise<string | null> {
    if (!force && cachedToken) return cachedToken;
    // force → interactive OAuth; otherwise attempt a silent token.
    const token = await sdkGetOneDriveToken(force);
    if (token) cachedToken = token;
    else if (force) cachedToken = null;
    return token;
  },
};

/** Attempt a silent token at startup; true if already authorized. */
export async function trySilentOneDrive(): Promise<boolean> {
  return (await oneDriveAuth.getToken(false)) !== null;
}

/** Explicit, interactive sign-in. */
export async function signInOneDrive(): Promise<boolean> {
  return (await oneDriveAuth.getToken(true)) !== null;
}

export async function signOutOneDrive(): Promise<void> {
  cachedToken = null;
  await sdkClearOneDrive();
}

export function isOneDriveSignedIn(): boolean {
  return cachedToken !== null;
}
