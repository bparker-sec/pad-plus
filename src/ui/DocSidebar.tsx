import { useApp } from '../state/AppProvider';
import { isDirty } from '../editor/documents';
import { AccountButton } from './AccountButton';
import { BrandMark } from './Brand';
import { IconClose, IconNew, IconOpen } from './icons';

export function DocSidebar({ width = 'w-48' }: { width?: string }) {
  const app = useApp();
  const { buffers, activeId } = app.state;

  return (
    <aside
      className={`flex ${width} shrink-0 flex-col border-r border-black/10 bg-neutral-100 dark:border-white/10 dark:bg-[#252526]`}
    >
      <div className="flex items-center gap-1.5 border-b border-black/10 px-2.5 py-2 dark:border-white/10">
        <BrandMark size={18} />
        <span className="text-[12px] font-semibold text-neutral-800 dark:text-neutral-100">
          Notepad++
        </span>
        <div className="ml-auto">
          <AccountButton compact />
        </div>
      </div>

      <div className="flex gap-1 border-b border-black/10 p-1.5 dark:border-white/10">
        <button
          onClick={app.newFile}
          className="flex flex-1 items-center justify-center gap-1 rounded bg-npp-green px-2 py-1 text-[12px] text-white hover:bg-npp-greenDark"
        >
          <IconNew size={14} /> New
        </button>
        <button
          onClick={() => app.openPicker('open')}
          className="flex flex-1 items-center justify-center gap-1 rounded border border-neutral-300 px-2 py-1 text-[12px] hover:bg-black/5 dark:border-neutral-600 dark:hover:bg-white/5"
        >
          <IconOpen size={14} /> Open
        </button>
      </div>

      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto py-1">
        <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
          Open documents
        </div>
        {buffers.map((b) => {
          const activeDoc = b.id === activeId;
          return (
            <div
              key={b.id}
              onClick={() => app.selectFile(b.id)}
              className={`group flex cursor-pointer items-center gap-1.5 px-2.5 py-1 text-[12px] ${
                activeDoc
                  ? 'bg-npp-green/15 text-npp-green'
                  : 'text-neutral-700 hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/5'
              }`}
            >
              <span className="flex-1 truncate">{b.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  app.closeFile(b.id);
                }}
                aria-label={`Close ${b.name}`}
                className="flex h-4 w-4 items-center justify-center rounded hover:bg-black/10 dark:hover:bg-white/20"
              >
                {isDirty(b) ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-npp-green group-hover:hidden" />
                ) : null}
                <IconClose
                  size={12}
                  className={isDirty(b) ? 'hidden group-hover:block' : 'block'}
                />
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
