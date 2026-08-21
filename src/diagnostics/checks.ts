// Self-contained troubleshooting checks for the OneDrive / host chain. Calls the
// SDK directly (not the crash-safe wrappers) so real errors and timings surface.
// Tokens are NEVER exposed — only their presence/length is reported.
import {
  getUserInfo,
  getToken,
  getAllowedModels,
  withTimeout,
} from 'ai-publish-sdk';

export type Status = 'pass' | 'fail' | 'warn' | 'skip' | 'running';

export interface CheckResult {
  id: string;
  label: string;
  status: Status;
  ms: number;
  detail: string;
  data?: Record<string, unknown>;
}

const GRAPH = 'https://graph.microsoft.com/v1.0';

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
function since(start: number): number {
  return Math.round(now() - start);
}
function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export function checkEnvironment(): CheckResult {
  const start = now();
  let framed = false;
  try {
    framed = window.parent !== window;
  } catch {
    framed = true;
  }
  const modes = [
    'standalone',
    'fullscreen',
    'minimal-ui',
    'window-controls-overlay',
  ] as const;
  const displayMode =
    modes.find((m) => window.matchMedia?.(`(display-mode: ${m})`).matches) ??
    'browser';
  return {
    id: 'env',
    label: 'Environment',
    status: 'pass',
    ms: since(start),
    detail: `${framed ? 'framed (iframe)' : 'top-level window'} · display: ${displayMode} · ${navigator.onLine ? 'online' : 'offline'}`,
    data: {
      framed,
      displayMode,
      online: navigator.onLine,
      url: location.href,
      language: navigator.language,
      userAgent: navigator.userAgent,
    },
  };
}

export async function checkHostUser(): Promise<CheckResult> {
  const start = now();
  try {
    const info = await withTimeout(() => getUserInfo(), 8000);
    if (!info) {
      return {
        id: 'host',
        label: 'AI-app host · getUserInfo()',
        status: 'warn',
        ms: since(start),
        detail: 'Host answered but returned no user info.',
      };
    }
    return {
      id: 'host',
      label: 'AI-app host · getUserInfo()',
      status: 'pass',
      ms: since(start),
      detail: `Host is answering. User: ${info.displayName || info.name || info.email || info.userId}`,
      data: {
        userId: info.userId,
        tenantId: info.tenantId,
        tenantName: info.tenantName,
        email: info.email,
        name: info.displayName || info.name,
      },
    };
  } catch (e) {
    return {
      id: 'host',
      label: 'AI-app host · getUserInfo()',
      status: 'fail',
      ms: since(start),
      detail: `${errMsg(e)} — no host is answering RPC (running without the AI-app host?).`,
    };
  }
}

export async function checkModels(): Promise<CheckResult> {
  const start = now();
  try {
    const m = await withTimeout(() => getAllowedModels(), 8000);
    return {
      id: 'models',
      label: 'AI-app host · getAllowedModels()',
      status: 'pass',
      ms: since(start),
      detail: `${m.models.length} model(s); default: ${m.defaultModel ?? 'none'}`,
      data: { models: m.models, defaultModel: m.defaultModel },
    };
  } catch (e) {
    return {
      id: 'models',
      label: 'AI-app host · getAllowedModels()',
      status: 'warn',
      ms: since(start),
      detail: errMsg(e),
    };
  }
}

export interface TokenCheck {
  result: CheckResult;
  token: string | null;
}

export async function checkToken(interactive: boolean): Promise<TokenCheck> {
  const start = now();
  const id = interactive ? 'tok-i' : 'tok-s';
  const label = `OneDrive token · getToken('onedrive', { interactive: ${interactive} })`;
  try {
    const res = interactive
      ? await withTimeout(() => getToken('onedrive', { interactive: true }), 120_000)
      : await withTimeout(() => getToken('onedrive', { interactive: false }), 10_000);
    if (res?.token) {
      return {
        token: res.token,
        result: {
          id,
          label,
          status: 'pass',
          ms: since(start),
          detail: `Token received (length ${res.token.length})${res.instanceUrl ? `, instanceUrl: ${res.instanceUrl}` : ''}.`,
          data: { tokenLength: res.token.length, instanceUrl: res.instanceUrl ?? null },
        },
      };
    }
    return {
      token: null,
      result: {
        id,
        label,
        status: interactive ? 'fail' : 'warn',
        ms: since(start),
        detail: interactive
          ? 'Host returned NO token (null). The OneDrive integration is not connected/authorized for this app, or its OAuth (provisioned/BYO) is not active for this tenant.'
          : 'No silent token yet (expected before first sign-in).',
      },
    };
  } catch (e) {
    return {
      token: null,
      result: {
        id,
        label,
        status: 'fail',
        ms: since(start),
        detail: `${errMsg(e)}${/timeout/i.test(errMsg(e)) ? ' — host did not respond in time.' : ''}`,
      },
    };
  }
}

interface GraphResponse {
  status: number;
  ok: boolean;
  json: unknown;
  text: string;
}

async function graphGet(
  token: string,
  path: string,
  timeoutMs = 15_000,
): Promise<GraphResponse> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${GRAPH}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: ctrl.signal,
    });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* non-JSON */
    }
    return { status: res.status, ok: res.ok, json, text };
  } finally {
    clearTimeout(timer);
  }
}

function graphError(r: GraphResponse): string {
  const j = r.json as { error?: { code?: string; message?: string } } | null;
  if (j?.error) return `${j.error.code ?? ''} ${j.error.message ?? ''}`.trim();
  return r.text.slice(0, 240);
}

export async function checkGraphMe(token: string): Promise<CheckResult> {
  const start = now();
  try {
    const r = await graphGet(token, '/me');
    if (r.ok) {
      const j = r.json as { id?: string; displayName?: string; userPrincipalName?: string };
      return {
        id: 'me',
        label: 'Graph · GET /me (User.Read)',
        status: 'pass',
        ms: since(start),
        detail: `${j.displayName ?? ''} <${j.userPrincipalName ?? ''}>`,
        data: { id: j.id, userPrincipalName: j.userPrincipalName },
      };
    }
    return {
      id: 'me',
      label: 'Graph · GET /me (User.Read)',
      status: r.status === 401 ? 'fail' : 'warn',
      ms: since(start),
      detail: `HTTP ${r.status}: ${graphError(r)}${r.status === 401 ? ' — token is not a valid Microsoft Graph token (wrong audience/expired).' : ''}`,
      data: { status: r.status },
    };
  } catch (e) {
    return {
      id: 'me',
      label: 'Graph · GET /me (User.Read)',
      status: 'fail',
      ms: since(start),
      detail: errMsg(e),
    };
  }
}

export async function checkGraphDrive(token: string): Promise<CheckResult> {
  const start = now();
  try {
    const r = await graphGet(token, '/me/drive');
    if (r.ok) {
      const j = r.json as {
        id?: string;
        driveType?: string;
        quota?: { used?: number; total?: number };
      };
      const gb = (n?: number) => (n ? (n / 1024 ** 3).toFixed(1) + ' GB' : '?');
      return {
        id: 'drive',
        label: 'Graph · GET /me/drive (Files.ReadWrite)',
        status: 'pass',
        ms: since(start),
        detail: `driveType: ${j.driveType ?? '?'} · quota ${gb(j.quota?.used)} / ${gb(j.quota?.total)}`,
        data: { id: j.id, driveType: j.driveType, quota: j.quota },
      };
    }
    return {
      id: 'drive',
      label: 'Graph · GET /me/drive (Files.ReadWrite)',
      status: 'fail',
      ms: since(start),
      detail: `HTTP ${r.status}: ${graphError(r)}${r.status === 403 ? ' — token lacks the Files.ReadWrite scope.' : ''}`,
      data: { status: r.status },
    };
  } catch (e) {
    return {
      id: 'drive',
      label: 'Graph · GET /me/drive (Files.ReadWrite)',
      status: 'fail',
      ms: since(start),
      detail: errMsg(e),
    };
  }
}

export async function checkGraphChildren(token: string): Promise<CheckResult> {
  const start = now();
  try {
    const r = await graphGet(token, '/me/drive/root/children?$top=5&$select=name,folder');
    if (r.ok) {
      const j = r.json as { value?: Array<{ name: string; folder?: unknown }> };
      const names = (j.value ?? []).map((i) => i.name);
      return {
        id: 'children',
        label: 'Graph · list root files',
        status: 'pass',
        ms: since(start),
        detail: `${names.length} item(s) at root${names.length ? ': ' + names.join(', ') : ''}`,
        data: { sample: names },
      };
    }
    return {
      id: 'children',
      label: 'Graph · list root files',
      status: 'fail',
      ms: since(start),
      detail: `HTTP ${r.status}: ${graphError(r)}`,
      data: { status: r.status },
    };
  } catch (e) {
    return {
      id: 'children',
      label: 'Graph · list root files',
      status: 'fail',
      ms: since(start),
      detail: errMsg(e),
    };
  }
}

export function skipped(id: string, label: string, reason: string): CheckResult {
  return { id, label, status: 'skip', ms: 0, detail: reason };
}

/** Build a sanitized, copy-pasteable text report. No token material is included. */
export function buildReport(results: CheckResult[]): string {
  const lines: string[] = [];
  lines.push('Notepad++ Web — OneDrive diagnostics');
  lines.push(new Date().toISOString());
  lines.push('='.repeat(48));
  for (const r of results) {
    lines.push(`[${r.status.toUpperCase()}] ${r.label} (${r.ms}ms)`);
    lines.push(`    ${r.detail}`);
    if (r.data) {
      for (const [k, v] of Object.entries(r.data)) {
        lines.push(`    ${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`);
      }
    }
  }
  return lines.join('\n');
}
