import { useMemo } from 'react';
import { useApp } from '../state/AppProvider';
import { extractSymbols, type OutlineSymbol } from '../editor/outline';
import { IconClose } from './icons';

const kindBadge: Record<OutlineSymbol['kind'], string> = {
  function: 'ƒ',
  class: 'C',
  interface: 'I',
  type: 'T',
  enum: 'E',
  heading: '#',
  rule: '{}',
};

/** Notepad++-style Function List: a source-ordered symbol outline. Docked in the
 * full-page layout; click a symbol to jump to its line. */
export function OutlinePanel() {
  const app = useApp();
  const active = app.active;
  const symbols = useMemo(
    () => (active ? extractSymbols(active.content, active.language) : []),
    [active],
  );

  return (
    <div className="flex h-full w-56 shrink-0 flex-col border-l border-black/10 bg-neutral-100 dark:border-white/10 dark:bg-[#252526]">
      <div className="flex items-center gap-2 border-b border-black/10 px-3 py-1.5 dark:border-white/10">
        <span className="text-[12px] font-medium text-neutral-700 dark:text-neutral-200">
          Function List
        </span>
        <button
          aria-label="Close Function List"
          onClick={app.toggleOutline}
          className="ml-auto rounded p-1 text-neutral-500 hover:bg-black/10 dark:hover:bg-white/10"
        >
          <IconClose size={14} />
        </button>
      </div>
      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto py-1">
        {symbols.length === 0 ? (
          <p className="px-3 py-2 text-[12px] text-neutral-500">
            {active ? 'No symbols found for this language.' : 'No file open.'}
          </p>
        ) : (
          symbols.map((s, i) => (
            <button
              key={`${s.line}-${i}`}
              onClick={() => app.revealLine(s.line)}
              title={`Line ${s.line}`}
              className="flex w-full items-center gap-2 px-3 py-1 text-left text-[13px] text-neutral-700 hover:bg-npp-green/10 dark:text-neutral-200"
            >
              <span className="w-4 shrink-0 text-center text-[11px] text-npp-green">
                {kindBadge[s.kind]}
              </span>
              <span className="flex-1 truncate">{s.name}</span>
              <span className="text-[11px] tabular-nums text-neutral-400">{s.line}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
