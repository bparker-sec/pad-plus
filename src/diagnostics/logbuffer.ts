// In-app log/error capture so problems are visible without browser devtools
// (the app runs embedded in the Island host, where there's no console access).
// Entries are kept in memory AND mirrored to localStorage so a crash that
// happens on load survives the next reload.

export interface LogEntry {
  t: string; // ISO timestamp
  level: 'error' | 'warn' | 'info';
  msg: string;
}

const MAX = 200;
const KEY = 'npp-logs';
let BUFFER: LogEntry[] = [];

// Restore anything captured before a reload (e.g. a crash on the previous load).
try {
  const raw = localStorage.getItem(KEY);
  if (raw) BUFFER = (JSON.parse(raw) as LogEntry[]).slice(-MAX);
} catch {
  /* ignore */
}

function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(BUFFER.slice(-MAX)));
  } catch {
    /* storage may be unavailable */
  }
}

function stamp(): string {
  // new Date() is fine in the browser runtime.
  return new Date().toISOString();
}

// Defense-in-depth: never let anything token-shaped land in the buffer (which
// persists to localStorage and is shown on the recovery/diagnostics screens).
export function redact(s: string): string {
  return s
    .replace(/\b(Bearer\s+)[A-Za-z0-9._~+/-]{12,}=*/gi, '$1[redacted]')
    .replace(/\beyJ[A-Za-z0-9._-]{10,}/g, '[redacted-jwt]')
    .replace(
      /((?:access|refresh|id)?[_-]?token["']?\s*[:=]\s*["']?)[A-Za-z0-9._~+/-]{12,}=*/gi,
      '$1[redacted]',
    );
}

function push(level: LogEntry['level'], msg: string): void {
  BUFFER.push({ t: stamp(), level, msg: redact(msg) });
  if (BUFFER.length > MAX) BUFFER = BUFFER.slice(-MAX);
  persist();
}

function fmt(arg: unknown): string {
  if (arg instanceof Error)
    return `${arg.name}: ${arg.message}\n${arg.stack ?? ''}`;
  if (typeof arg === 'string') return arg;
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

/** Record an error with an optional origin label and extra context. */
export function recordError(origin: string, error: unknown, extra = ''): void {
  const e = error as { name?: string; message?: string; stack?: string };
  const head =
    error instanceof Error ? `${e.name}: ${e.message}` : `${String(error)}`;
  push(
    'error',
    `[${origin}] ${head}\n${e.stack ?? ''}${extra ? `\n${extra}` : ''}`.trim(),
  );
}

export function getLogs(): LogEntry[] {
  return [...BUFFER];
}

export function getLogsText(): string {
  if (!BUFFER.length) return 'No captured logs.';
  return BUFFER.map((l) => `[${l.t}] ${l.level.toUpperCase()} ${l.msg}`).join(
    '\n\n',
  );
}

export function clearLogs(): void {
  BUFFER = [];
  persist();
}

let installed = false;

/** Hook global error/rejection handlers and console.error/warn. Idempotent. */
export function installGlobalCapture(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener('error', (e) => {
    const at = e.filename ? ` @ ${e.filename}:${e.lineno}:${e.colno}` : '';
    push(
      'error',
      `window.onerror: ${e.message}${at}\n${e.error?.stack ?? ''}`.trim(),
    );
  });

  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason as { stack?: string } | undefined;
    push(
      'error',
      `unhandledrejection: ${fmt(e.reason)}\n${r?.stack ?? ''}`.trim(),
    );
  });

  const origError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    push('error', args.map(fmt).join(' '));
    origError(...args);
  };
  const origWarn = console.warn.bind(console);
  console.warn = (...args: unknown[]) => {
    push('warn', args.map(fmt).join(' '));
    origWarn(...args);
  };
}
