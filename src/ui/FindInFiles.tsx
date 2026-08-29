import { useEffect, useState } from 'react';
import { useApp } from '../state/AppProvider';
import {
  search,
  type SearchOptions,
  type LineMatch,
} from '../editor/findInFiles';
import {
  listChildren,
  readFile,
  isFolder,
  type DriveItem,
} from '../onedrive/graph';
import { oneDriveAuth } from '../onedrive/auth';
import { IconClose, IconFile } from './icons';

type Scope = 'tabs' | 'drive';
type Source = { kind: 'tab'; id: string } | { kind: 'drive'; item: DriveItem };
interface FileResult {
  key: string;
  name: string;
  source: Source;
  matches: LineMatch[];
}

// Bounds for the recursive OneDrive scan so a big drive can't hang the app.
const MAX_FILES = 200;
const MAX_DEPTH = 6;
const MAX_BYTES = 1_000_000;

// Text-like extensions worth scanning; everything else is skipped as binary.
const TEXT_EXTS = new Set(
  (
    'txt md markdown log csv tsv json jsonc js mjs cjs jsx ts tsx html htm xml svg ' +
    'css scss less yml yaml ini cfg conf toml py rb php java c h cpp cc hpp cs go rs ' +
    'kt swift sh bash bat ps1 sql lua pl r dart scala clj ex exs graphql gql diff patch'
  ).split(' '),
);

function isTextLike(name: string): boolean {
  const dot = name.lastIndexOf('.');
  return dot > 0 && TEXT_EXTS.has(name.slice(dot + 1).toLowerCase());
}

export function FindInFiles() {
  const app = useApp();
  const [query, setQuery] = useState('');
  const [regex, setRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [scope, setScope] = useState<Scope>('tabs');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<FileResult[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [ran, setRan] = useState(false);

  useEffect(() => {
    if (app.findOpen) {
      setError(null);
      setResults([]);
      setRan(false);
    }
  }, [app.findOpen]);

  if (!app.findOpen) return null;

  const opts: SearchOptions = { regex, caseSensitive, wholeWord };

  const searchTabs = (): FileResult[] =>
    app.state.buffers
      .map((b) => ({
        key: b.id,
        name: b.name,
        source: { kind: 'tab', id: b.id } as Source,
        matches: search(b.content, query, opts),
      }))
      .filter((r) => r.matches.length > 0);

  const searchDrive = async (): Promise<FileResult[]> => {
    const found: FileResult[] = [];
    let scanned = 0;
    let cutoff = false;
    const walk = async (folderId: string | undefined, depth: number) => {
      if (depth > MAX_DEPTH || scanned >= MAX_FILES) {
        if (scanned >= MAX_FILES) cutoff = true;
        return;
      }
      const children = await listChildren(oneDriveAuth, folderId);
      for (const item of children) {
        if (scanned >= MAX_FILES) {
          cutoff = true;
          return;
        }
        if (isFolder(item)) {
          await walk(item.id, depth + 1);
        } else if (isTextLike(item.name) && (item.size ?? 0) <= MAX_BYTES) {
          scanned += 1;
          try {
            const { text } = await readFile(oneDriveAuth, item.id);
            const matches = search(text, query, opts);
            if (matches.length) {
              found.push({
                key: item.id,
                name: item.parentReference?.path
                  ? `${item.parentReference.path.replace('/drive/root:', '')}/${item.name}`
                  : item.name,
                source: { kind: 'drive', item },
                matches,
              });
            }
          } catch {
            /* skip unreadable file */
          }
        }
      }
    };
    await walk(undefined, 0);
    setTruncated(cutoff);
    return found;
  };

  const run = async () => {
    if (!query.trim()) return;
    setRunning(true);
    setError(null);
    setTruncated(false);
    try {
      if (scope === 'drive' && !app.signedIn) {
        setError('Connect OneDrive first to search your files.');
        setResults([]);
        return;
      }
      const res = scope === 'tabs' ? searchTabs() : await searchDrive();
      setResults(res);
      setRan(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed.');
    } finally {
      setRunning(false);
    }
  };

  const goTo = async (source: Source, line: number) => {
    if (source.kind === 'tab') {
      app.selectFile(source.id);
      app.revealLine(line);
      app.closeFind();
    } else {
      await app.openFromOneDrive(source.item);
      setTimeout(() => app.revealLine(line), 80);
      app.closeFind();
    }
  };

  const totalMatches = results.reduce((n, r) => n + r.matches.length, 0);

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 p-3"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) app.closeFind();
      }}
    >
      <div className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-[#252526]">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-black/10 px-3 py-2 dark:border-white/10">
          <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
            Find in Files
          </span>
          <button
            aria-label="Close"
            onClick={app.closeFind}
            className="ml-auto rounded p-1 text-neutral-500 hover:bg-black/10 dark:hover:bg-white/10"
          >
            <IconClose size={16} />
          </button>
        </div>

        {/* Query + options */}
        <div className="flex flex-col gap-2 border-b border-black/10 px-3 py-2 dark:border-white/10">
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void run();
              }}
              placeholder="Find…"
              className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-transparent px-2 py-1 text-[13px] outline-none focus:border-npp-green dark:border-neutral-600"
            />
            <select
              aria-label="Search scope"
              value={scope}
              onChange={(e) => setScope(e.target.value as Scope)}
              className="shrink-0 rounded-md border border-neutral-300 bg-transparent px-2 py-1 text-[13px] outline-none focus:border-npp-green dark:border-neutral-600 dark:bg-[#252526]"
            >
              <option value="tabs">Open tabs</option>
              <option value="drive">OneDrive (recursive)</option>
            </select>
            <button
              disabled={running || !query.trim()}
              onClick={run}
              className="shrink-0 rounded-md bg-npp-green px-3 py-1 text-[13px] text-white hover:bg-npp-greenDark disabled:opacity-40"
            >
              {running ? 'Searching…' : 'Search'}
            </button>
          </div>
          <div className="flex items-center gap-4 text-[12px] text-neutral-600 dark:text-neutral-300">
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={caseSensitive}
                onChange={(e) => setCaseSensitive(e.target.checked)}
              />
              Match case
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={wholeWord}
                onChange={(e) => setWholeWord(e.target.checked)}
              />
              Whole word
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={regex}
                onChange={(e) => setRegex(e.target.checked)}
              />
              Regex
            </label>
          </div>
        </div>

        {/* Results */}
        <div className="thin-scroll min-h-[10rem] flex-1 overflow-y-auto">
          {error ? (
            <p className="px-3 py-6 text-center text-[12px] text-red-500">
              {error}
            </p>
          ) : running ? (
            <p className="px-3 py-6 text-center text-[12px] text-neutral-500">
              <span className="animate-pulse">Searching…</span>
            </p>
          ) : ran && results.length === 0 ? (
            <p className="px-3 py-6 text-center text-[12px] text-neutral-500">
              No matches.
            </p>
          ) : (
            results.map((r) => (
              <div
                key={r.key}
                className="border-b border-black/5 dark:border-white/5"
              >
                <div className="flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-neutral-700 dark:text-neutral-200">
                  <IconFile size={14} className="shrink-0 text-neutral-400" />
                  <span className="truncate">{r.name}</span>
                  <span className="ml-auto text-[11px] text-neutral-400">
                    {r.matches.length}
                  </span>
                </div>
                {r.matches.map((m, i) => (
                  <button
                    key={`${m.line}-${m.column}-${i}`}
                    onClick={() => void goTo(r.source, m.line)}
                    className="flex w-full items-baseline gap-2 px-3 py-0.5 pl-8 text-left text-[12px] hover:bg-npp-green/10"
                  >
                    <span className="w-10 shrink-0 text-right tabular-nums text-neutral-400">
                      {m.line}
                    </span>
                    <span className="flex-1 truncate font-mono text-neutral-600 dark:text-neutral-300">
                      {m.preview.trim()}
                    </span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Footer status */}
        <div className="border-t border-black/10 px-3 py-1.5 text-[11px] text-neutral-500 dark:border-white/10">
          {ran && !running && !error
            ? `${totalMatches} match${totalMatches === 1 ? '' : 'es'} in ${results.length} file${results.length === 1 ? '' : 's'}${truncated ? ` · stopped at ${MAX_FILES} files scanned` : ''}`
            : scope === 'drive'
              ? `Scans up to ${MAX_FILES} text files under your OneDrive root.`
              : 'Searches all open tabs.'}
        </div>
      </div>
    </div>
  );
}
