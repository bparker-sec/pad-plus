import { describe, it, expect, vi } from 'vitest';
import {
  OneDriveSession,
  type SessionProvider,
  type RecoveryStore,
} from './session';
import type { OneDriveTokenResult } from '../sdk/client';

/** Provider whose acquire() calls are resolved manually so races are deterministic. */
class ControllableProvider implements SessionProvider {
  acquireCalls: Array<{
    interactive: boolean;
    resolve: (r: OneDriveTokenResult) => void;
  }> = [];
  clearCalls = 0;
  autoClear = true;
  clearResult = true;
  private clearResolvers: Array<(b: boolean) => void> = [];

  acquire(interactive: boolean): Promise<OneDriveTokenResult> {
    return new Promise((resolve) => {
      this.acquireCalls.push({ interactive, resolve });
    });
  }
  clear(): Promise<boolean> {
    this.clearCalls += 1;
    if (this.autoClear) return Promise.resolve(this.clearResult);
    return new Promise((resolve) => this.clearResolvers.push(resolve));
  }
  resolveClear(v: boolean) {
    this.clearResolvers.forEach((r) => r(v));
    this.clearResolvers = [];
  }
  last() {
    return this.acquireCalls[this.acquireCalls.length - 1];
  }
}

function makeStore(initial = false): RecoveryStore & { value: () => boolean } {
  let v = initial;
  return {
    getClearRequired: () => v,
    setClearRequired: (x: boolean) => {
      v = x;
    },
    value: () => v,
  };
}

const OK = (token: string): OneDriveTokenResult => ({ ok: true, token });

describe('OneDriveSession — clearing', () => {
  it('clears host + local session and lands in sign_in_required', async () => {
    const p = new ControllableProvider();
    const store = makeStore();
    const s = new OneDriveSession(p, store);

    const conn = s.acquire(true);
    p.last().resolve(OK('T1'));
    await conn;
    expect(s.isSignedIn()).toBe(true);

    const ok = await s.clearSession();
    expect(ok).toBe(true);
    expect(p.clearCalls).toBe(1);
    expect(s.isSignedIn()).toBe(false);
    expect(s.getToken()).toBeNull();
    expect(s.state).toBe('sign_in_required');
    expect(store.value()).toBe(false);
  });

  it('does NOT call acquire()/OAuth during a clear', async () => {
    const p = new ControllableProvider();
    p.autoClear = false;
    const s = new OneDriveSession(p);

    const clearing = s.clearSession();
    // While clearing is in flight, no token acquisition happens...
    const outcome = await s.acquire(true);
    expect(outcome).toEqual({
      ok: false,
      reason: 'blocked',
      detail: expect.any(String),
    });
    expect(p.acquireCalls).toHaveLength(0);

    p.resolveClear(true);
    await clearing;
  });

  it('serializes duplicate clears into a single host clear', async () => {
    const p = new ControllableProvider();
    p.autoClear = false;
    const s = new OneDriveSession(p);

    const a = s.clearSession();
    const b = s.clearSession();
    expect(p.clearCalls).toBe(1);

    p.resolveClear(true);
    expect(await a).toBe(true);
    expect(await b).toBe(true);
  });

  it('a failed host clear surfaces recovery and blocks sign-in', async () => {
    const p = new ControllableProvider();
    p.clearResult = false;
    const store = makeStore();
    const s = new OneDriveSession(p, store);

    const ok = await s.clearSession();
    expect(ok).toBe(false);
    expect(s.state).toBe('clear_failed');
    expect(s.clearRequired()).toBe(true);
    expect(store.value()).toBe(true); // durable recovery flag persisted

    // Sign-in is blocked until a successful clear.
    const outcome = await s.acquire(true);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.reason).toBe('blocked');
    expect(p.acquireCalls).toHaveLength(0);
  });
});

describe('OneDriveSession — races', () => {
  it('clearing during an in-flight connection cannot restore the old token', async () => {
    const p = new ControllableProvider();
    const s = new OneDriveSession(p);

    const conn = s.acquire(true); // in-flight interactive sign-in
    await s.clearSession(); // reset happens first (invalidates generation)
    p.last().resolve(OK('STALE')); // the old connection now resolves
    const outcome = await conn;

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.reason).toBe('superseded');
    expect(s.getToken()).toBeNull();
    expect(s.state).toBe('sign_in_required');
  });

  it('stale silent validation cannot overwrite a fresh interactive login', async () => {
    const p = new ControllableProvider();
    const s = new OneDriveSession(p);

    const silent = s.acquire(false); // starts first (seq 1)
    const interactive = s.acquire(true); // starts later (seq 2)

    p.acquireCalls[1].resolve(OK('NEW')); // interactive resolves first → commits
    expect((await interactive)).toEqual({ ok: true, token: 'NEW' });
    expect(s.getToken()).toBe('NEW');

    p.acquireCalls[0].resolve(OK('OLD')); // stale silent resolves later
    const silentOutcome = await silent;
    expect(silentOutcome.ok).toBe(false);
    if (!silentOutcome.ok) expect(silentOutcome.reason).toBe('superseded');
    expect(s.getToken()).toBe('NEW'); // fresh login preserved
  });

  it('does not start a connection while clearing is active', async () => {
    const p = new ControllableProvider();
    p.autoClear = false;
    const s = new OneDriveSession(p);

    const clearing = s.clearSession();
    const blocked = await s.acquire(true);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.reason).toBe('blocked');

    p.resolveClear(true);
    await clearing;

    // After the clear completes, connecting is allowed again.
    const conn = s.acquire(true);
    p.last().resolve(OK('AFTER'));
    expect(await conn).toEqual({ ok: true, token: 'AFTER' });
  });

  it('a failed acquire is non-destructive (keeps an existing valid token)', async () => {
    const p = new ControllableProvider();
    const s = new OneDriveSession(p);

    const first = s.acquire(true);
    p.last().resolve(OK('GOOD'));
    await first;

    const second = s.acquire(true);
    p.last().resolve({ ok: false, reason: 'no_token' });
    await second;

    expect(s.getToken()).toBe('GOOD');
    expect(s.isSignedIn()).toBe(true);
  });
});

describe('OneDriveSession — reload recovery', () => {
  it('an interrupted clear (persisted flag) stays recoverable after reload', async () => {
    const p = new ControllableProvider();
    const store = makeStore(true); // simulate reload after a failed/interrupted clear
    const s = new OneDriveSession(p, store);

    expect(s.state).toBe('clear_failed');
    const blocked = await s.acquire(true);
    if (!blocked.ok) expect(blocked.reason).toBe('blocked');

    const ok = await s.clearSession();
    expect(ok).toBe(true);
    expect(s.state).toBe('sign_in_required');
    expect(store.value()).toBe(false);

    const conn = s.acquire(true);
    p.last().resolve(OK('FRESH'));
    expect(await conn).toEqual({ ok: true, token: 'FRESH' });
  });
});

// Verifies the real SDK wrapper targets the correct integration name and never throws.
describe('sdkClearOneDriveResult (integration name + error handling)', () => {
  it("calls clearToken('onedrive') and returns true on success", async () => {
    vi.resetModules();
    const clearToken = vi.fn().mockResolvedValue(undefined);
    vi.doMock('ai-publish-sdk', () => ({
      clearToken,
      getToken: vi.fn(),
      getUserInfo: vi.fn(),
      getBrandingAssets: vi.fn(),
      getAllowedModels: vi.fn(),
      trackEvent: vi.fn(),
      withTimeout: (fn: () => Promise<unknown>) => fn(),
    }));
    const { sdkClearOneDriveResult } = await import('../sdk/client');
    await expect(sdkClearOneDriveResult()).resolves.toBe(true);
    expect(clearToken).toHaveBeenCalledWith('onedrive');
    vi.doUnmock('ai-publish-sdk');
  });

  it('returns false (never throws) when the host clear fails', async () => {
    vi.resetModules();
    const clearToken = vi.fn().mockRejectedValue(new Error('host error'));
    vi.doMock('ai-publish-sdk', () => ({
      clearToken,
      getToken: vi.fn(),
      getUserInfo: vi.fn(),
      getBrandingAssets: vi.fn(),
      getAllowedModels: vi.fn(),
      trackEvent: vi.fn(),
      withTimeout: (fn: () => Promise<unknown>) => fn(),
    }));
    const { sdkClearOneDriveResult } = await import('../sdk/client');
    await expect(sdkClearOneDriveResult()).resolves.toBe(false);
    vi.doUnmock('ai-publish-sdk');
  });
});
