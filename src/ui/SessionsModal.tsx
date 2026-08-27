import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../state/AppProvider';
import {
  saveNamedSession,
  listNamedSessions,
  loadNamedSession,
  deleteNamedSession,
  type NamedSessionInfo,
} from '../editor/persistence';
import { IconClose } from './icons';

/** Save the current set of open tabs under a name, and reload a saved set. */
export function SessionsModal() {
  const app = useApp();
  const [rows, setRows] = useState<NamedSessionInfo[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setRows(await listNamedSessions());
  }, []);

  useEffect(() => {
    if (app.sessionsOpen) {
      setName('');
      void refresh();
    }
  }, [app.sessionsOpen, refresh]);

  if (!app.sessionsOpen) return null;

  const save = async () => {
    const n = name.trim();
    if (!n) return;
    setBusy(true);
    try {
      await saveNamedSession(n, app.state, new Date().toISOString());
      app.notify(`Saved session “${n}”`);
      setName('');
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const load = async (n: string) => {
    const state = await loadNamedSession(n);
    if (state) {
      app.hydrate(state);
      app.notify(`Loaded session “${n}”`);
      app.closeSessions();
    } else {
      app.notify('Could not load that session.');
    }
  };

  const remove = async (n: string) => {
    await deleteNamedSession(n);
    await refresh();
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 p-3"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) app.closeSessions();
      }}
    >
      <div className="flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-lg border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-[#252526]">
        <div className="flex items-center gap-2 border-b border-black/10 px-3 py-2 dark:border-white/10">
          <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
            Sessions
          </span>
          <button
            aria-label="Close"
            onClick={app.closeSessions}
            className="ml-auto rounded p-1 text-neutral-500 hover:bg-black/10 dark:hover:bg-white/10"
          >
            <IconClose size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2 border-b border-black/10 px-3 py-2 dark:border-white/10">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void save();
            }}
            placeholder="Session name"
            className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-transparent px-2 py-1 text-[13px] outline-none focus:border-npp-green dark:border-neutral-600"
          />
          <button
            disabled={busy || !name.trim()}
            onClick={save}
            className="shrink-0 rounded-md bg-npp-green px-3 py-1 text-[13px] text-white hover:bg-npp-greenDark disabled:opacity-40"
          >
            Save current
          </button>
        </div>

        <div className="thin-scroll min-h-[8rem] flex-1 overflow-y-auto py-1">
          {rows.length === 0 ? (
            <p className="px-3 py-6 text-center text-[12px] text-neutral-500">
              No saved sessions yet.
            </p>
          ) : (
            rows.map((r) => (
              <div
                key={r.name}
                className="flex items-center gap-2 px-3 py-1.5 text-[13px] hover:bg-npp-green/5"
              >
                <button
                  onClick={() => load(r.name)}
                  title={`Saved ${r.savedAt}`}
                  className="flex-1 truncate text-left text-neutral-800 hover:text-npp-green dark:text-neutral-200"
                >
                  {r.name}
                </button>
                <span className="shrink-0 text-[11px] text-neutral-400">
                  {new Date(r.savedAt).toLocaleString()}
                </span>
                <button
                  onClick={() => remove(r.name)}
                  aria-label={`Delete ${r.name}`}
                  className="shrink-0 rounded p-1 text-neutral-400 hover:bg-black/10 hover:text-red-500 dark:hover:bg-white/10"
                >
                  <IconClose size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
