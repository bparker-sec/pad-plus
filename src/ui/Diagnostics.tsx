import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../state/AppProvider';
import { IconClose } from './icons';
import { ONEDRIVE_DOCS_URL, ONEDRIVE_DOCS_LABEL } from '../onedrive/docs';
import { buildLabel } from '../buildInfo';
import {
  checkBuild,
  checkEnvironment,
  checkSession,
  checkHostUser,
  checkModels,
  checkToken,
  checkGraphMe,
  checkGraphDrive,
  checkGraphChildren,
  runClearSession,
  skipped,
  buildReport,
  type CheckResult,
  type TokenCheck,
} from '../diagnostics/checks';

const dotClass: Record<CheckResult['status'], string> = {
  pass: 'bg-emerald-500',
  fail: 'bg-red-500',
  warn: 'bg-amber-500',
  skip: 'bg-neutral-400',
  running: 'bg-blue-500 animate-pulse',
};

export function Diagnostics() {
  const app = useApp();
  const [results, setResults] = useState<CheckResult[]>([]);
  const [running, setRunning] = useState(false);
  const startedRef = useRef(false);

  const runSuite = useCallback(async (interactive: boolean) => {
    setRunning(true);
    const acc: CheckResult[] = [];
    const push = (r: CheckResult) => {
      acc.push(r);
      setResults([...acc]);
    };

    push(checkBuild());
    push(checkEnvironment());
    push(checkSession());

    // For interactive runs, fire the token request FIRST so the button click's
    // user-gesture is still active if the host opens an OAuth popup.
    let tc: TokenCheck | undefined;
    if (interactive) tc = await checkToken(true);

    const host = await checkHostUser();
    push(host);
    const hostDead = host.status === 'fail';

    push(
      hostDead && !interactive
        ? skipped(
            'models',
            'AI-app host · getAllowedModels()',
            'Skipped — host not answering.',
          )
        : await checkModels(),
    );

    if (!interactive) {
      tc = hostDead
        ? {
            token: null,
            result: skipped(
              'tok-s',
              "OneDrive token · getToken('onedrive')",
              'Skipped — host not answering RPC.',
            ),
          }
        : await checkToken(false);
    }
    push(tc!.result);

    if (tc!.token) {
      push(await checkGraphMe(tc!.token));
      push(await checkGraphDrive(tc!.token));
      push(await checkGraphChildren(tc!.token));
    } else {
      const why = tc!.token === null && !hostDead ? 'no token' : 'host not answering';
      push(skipped('me', 'Graph · GET /me', `Skipped — ${why}.`));
      push(skipped('drive', 'Graph · GET /me/drive', `Skipped — ${why}.`));
      push(skipped('children', 'Graph · list root files', `Skipped — ${why}.`));
    }
    setRunning(false);
  }, []);

  const clearHostSession = useCallback(async () => {
    setRunning(true);
    const clearRes = await runClearSession();
    setResults((prev) => [...prev, clearRes, checkSession()]);
    setRunning(false);
  }, []);

  useEffect(() => {
    if (app.diagnosticsOpen && !startedRef.current) {
      startedRef.current = true;
      void runSuite(false);
    }
    if (!app.diagnosticsOpen) startedRef.current = false;
  }, [app.diagnosticsOpen, runSuite]);

  if (!app.diagnosticsOpen) return null;

  const report = buildReport(results);
  const tokenFailed = results.some(
    (r) => (r.id === 'tok-i' || r.id === 'tok-s') && r.status === 'fail',
  );
  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(report);
      app.notify('Diagnostics copied to clipboard');
    } catch {
      app.notify('Copy failed — select the report text manually');
    }
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 p-3"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) app.closeDiagnostics();
      }}
    >
      <div className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-[#252526]">
        <div className="flex items-center gap-2 border-b border-black/10 px-3 py-2 dark:border-white/10">
          <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
            OneDrive Diagnostics
          </span>
          <span
            className="text-[11px] text-neutral-400"
            title="Build currently running (compare on relaunch to confirm the deployment)"
          >
            {buildLabel()}
          </span>
          {running && (
            <span className="animate-pulse text-[11px] text-blue-500">running…</span>
          )}
          <button
            aria-label="Close"
            onClick={app.closeDiagnostics}
            className="ml-auto rounded p-1 text-neutral-500 hover:bg-black/10 dark:hover:bg-white/10"
          >
            <IconClose size={16} />
          </button>
        </div>

        <div className="thin-scroll min-h-[10rem] flex-1 overflow-y-auto">
          {results.map((r, i) => (
            <div
              key={`${r.id}-${i}`}
              className="border-b border-black/5 px-3 py-2 dark:border-white/5"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotClass[r.status]}`}
                />
                <span className="text-[13px] font-medium text-neutral-800 dark:text-neutral-100">
                  {r.label}
                </span>
                <span className="ml-auto text-[11px] tabular-nums text-neutral-400">
                  {r.ms}ms
                </span>
              </div>
              <div className="mt-0.5 pl-[18px] text-[12px] leading-snug text-neutral-600 dark:text-neutral-300">
                {r.detail}
              </div>
            </div>
          ))}
          {results.length === 0 && (
            <div className="px-3 py-6 text-center text-[12px] text-neutral-500">
              Running checks…
            </div>
          )}

          {tokenFailed && (
            <div className="mx-3 my-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/60 dark:text-amber-100">
              OneDrive isn’t connected for this app. Follow Island’s setup guide:{' '}
              <a
                href={ONEDRIVE_DOCS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline"
              >
                {ONEDRIVE_DOCS_LABEL} ↗
              </a>
              <div className="mt-0.5 break-all opacity-70">{ONEDRIVE_DOCS_URL}</div>
            </div>
          )}

          <div className="px-3 pt-1 text-[12px] text-neutral-500">
            Setup help:{' '}
            <a
              href={ONEDRIVE_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-npp-green underline"
            >
              {ONEDRIVE_DOCS_LABEL} ↗
            </a>
          </div>

          <details className="px-3 py-2 text-[12px] text-neutral-500">
            <summary className="cursor-pointer select-none">
              Raw report (copy &amp; paste)
            </summary>
            <textarea
              readOnly
              value={report}
              onFocus={(e) => e.currentTarget.select()}
              className="thin-scroll mt-2 h-40 w-full resize-none rounded border border-black/10 bg-neutral-50 p-2 font-mono text-[11px] text-neutral-700 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-neutral-300"
            />
          </details>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-black/10 px-3 py-2 dark:border-white/10">
          <button
            disabled={running}
            onClick={() => void runSuite(false)}
            className="rounded-md border border-neutral-300 px-3 py-1 text-[13px] hover:bg-black/5 disabled:opacity-40 dark:border-neutral-600 dark:hover:bg-white/5"
          >
            Re-run
          </button>
          <button
            disabled={running}
            onClick={() => void runSuite(true)}
            className="rounded-md bg-npp-green px-3 py-1 text-[13px] text-white hover:bg-npp-greenDark disabled:opacity-40"
          >
            Interactive sign-in &amp; test
          </button>
          <button
            disabled={running}
            onClick={() => void clearHostSession()}
            title="Calls clearToken('onedrive') to clear the host + local session, then re-reads state. Use this to recover a stale/wrong-account connection."
            className="rounded-md border border-amber-400 px-3 py-1 text-[13px] text-amber-700 hover:bg-amber-50 disabled:opacity-40 dark:border-amber-500/60 dark:text-amber-300 dark:hover:bg-amber-500/10"
          >
            Clear host session
          </button>
          <button
            onClick={copyReport}
            className="rounded-md border border-neutral-300 px-3 py-1 text-[13px] hover:bg-black/5 dark:border-neutral-600 dark:hover:bg-white/5"
          >
            Copy report
          </button>
          <button
            onClick={app.closeDiagnostics}
            className="ml-auto rounded-md px-3 py-1 text-[13px] text-neutral-500 hover:bg-black/5 dark:hover:bg-white/5"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
