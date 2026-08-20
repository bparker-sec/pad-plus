import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../state/AppProvider';
import {
  listChildren,
  sortItems,
  isFolder,
  type DriveItem,
} from './graph';
import { oneDriveAuth } from './auth';
import {
  IconBack,
  IconClose,
  IconCloud,
  IconFile,
  IconFolder,
} from '../ui/icons';

interface Crumb {
  id?: string;
  name: string;
}

export function OneDrivePicker() {
  const app = useApp();
  const { picker } = app;
  const saveMode = picker.mode === 'save';

  const [stack, setStack] = useState<Crumb[]>([{ name: 'OneDrive' }]);
  const [items, setItems] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState('');
  const [busy, setBusy] = useState(false);

  const currentId = stack[stack.length - 1]?.id;

  const load = useCallback(async (folderId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const children = await listChildren(oneDriveAuth, folderId);
      setItems(sortItems(children));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load OneDrive.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reset + load whenever the picker opens.
  useEffect(() => {
    if (!picker.open) return;
    setStack([{ name: 'OneDrive' }]);
    setFilename(saveMode ? app.active?.name ?? 'new 1.txt' : '');
    if (app.signedIn) void load(undefined);
    else setItems([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picker.open]);

  if (!picker.open) return null;

  const openFolder = (item: DriveItem) => {
    setStack((s) => [...s, { id: item.id, name: item.name }]);
    void load(item.id);
  };

  const goToCrumb = (index: number) => {
    const next = stack.slice(0, index + 1);
    setStack(next);
    void load(next[next.length - 1]?.id);
  };

  const onPick = (item: DriveItem) => {
    if (isFolder(item)) {
      openFolder(item);
    } else if (!saveMode) {
      void app.openFromOneDrive(item);
    } else {
      setFilename(item.name);
    }
  };

  const connect = async () => {
    await app.signIn();
    // signIn updates context; reload once signed in.
    void load(undefined);
  };

  const doSave = async () => {
    setBusy(true);
    try {
      await app.commitSaveAs(currentId, filename);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 p-3"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) app.closePicker();
      }}
    >
      <div className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-lg border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-[#252526]">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-black/10 px-3 py-2 dark:border-white/10">
          <IconCloud size={18} className="text-npp-green" />
          <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
            {saveMode ? 'Save to OneDrive' : 'Open from OneDrive'}
          </span>
          <button
            aria-label="Close"
            onClick={app.closePicker}
            className="ml-auto rounded p-1 text-neutral-500 hover:bg-black/10 dark:hover:bg-white/10"
          >
            <IconClose size={16} />
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-black/10 px-3 py-1.5 text-[12px] dark:border-white/10">
          {stack.length > 1 && (
            <button
              onClick={() => goToCrumb(stack.length - 2)}
              className="mr-1 rounded p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
              aria-label="Back"
            >
              <IconBack size={14} />
            </button>
          )}
          {stack.map((c, i) => (
            <span key={i} className="flex items-center whitespace-nowrap">
              {i > 0 && <span className="px-1 text-neutral-400">/</span>}
              <button
                onClick={() => goToCrumb(i)}
                className={`rounded px-1 py-0.5 hover:bg-black/10 dark:hover:bg-white/10 ${
                  i === stack.length - 1
                    ? 'font-medium text-neutral-800 dark:text-neutral-100'
                    : 'text-neutral-500'
                }`}
              >
                {c.name}
              </button>
            </span>
          ))}
        </div>

        {/* Body */}
        <div className="thin-scroll min-h-[12rem] flex-1 overflow-y-auto">
          {!app.signedIn ? (
            app.hostAvailable ? (
              <div className="flex h-48 flex-col items-center justify-center gap-3 text-sm text-neutral-500">
                <p>Connect your OneDrive to browse files.</p>
                <button
                  onClick={connect}
                  className="flex items-center gap-1.5 rounded-md bg-npp-green px-3 py-1.5 text-white hover:bg-npp-greenDark"
                >
                  <IconCloud size={15} /> Connect OneDrive
                </button>
              </div>
            ) : (
              <div className="flex h-48 flex-col items-center justify-center gap-2 px-6 text-center text-sm text-neutral-500">
                <p className="font-medium text-neutral-700 dark:text-neutral-200">
                  OneDrive isn&rsquo;t available in this window
                </p>
                <p>
                  Notepad++ Web reaches OneDrive through the AI-app host. This
                  looks like a standalone window with no host, so sign-in
                  can&rsquo;t complete here. Open it inside the AI app to connect.
                </p>
                <button
                  onClick={connect}
                  className="mt-1 rounded-md border border-neutral-300 px-3 py-1 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  Try anyway
                </button>
              </div>
            )
          ) : loading ? (
            <div className="flex h-48 items-center justify-center text-sm text-neutral-500">
              <span className="animate-pulse">Loading…</span>
            </div>
          ) : error ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2 px-4 text-center text-sm text-red-500">
              <p>{error}</p>
              <button
                onClick={() => load(currentId)}
                className="rounded-md border border-neutral-300 px-3 py-1 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Retry
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-neutral-500">
              This folder is empty.
            </div>
          ) : (
            <ul className="py-1">
              {items.map((item) => {
                const folder = isFolder(item);
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => onPick(item)}
                      className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[13px] text-neutral-700 hover:bg-npp-green/10 dark:text-neutral-200"
                    >
                      {folder ? (
                        <IconFolder size={16} className="shrink-0 text-npp-green" />
                      ) : (
                        <IconFile size={16} className="shrink-0 text-neutral-400" />
                      )}
                      <span className="flex-1 truncate">{item.name}</span>
                      {folder && (
                        <span className="text-[11px] text-neutral-400">
                          {item.folder?.childCount ?? ''}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer (save mode) */}
        {saveMode && app.signedIn && (
          <div className="flex items-center gap-2 border-t border-black/10 px-3 py-2 dark:border-white/10">
            <input
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="filename.txt"
              className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-transparent px-2 py-1 text-[13px] outline-none focus:border-npp-green dark:border-neutral-600"
            />
            <button
              disabled={busy || !filename.trim()}
              onClick={doSave}
              className="rounded-md bg-npp-green px-3 py-1 text-[13px] text-white hover:bg-npp-greenDark disabled:opacity-40"
            >
              {busy ? 'Saving…' : 'Save here'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
