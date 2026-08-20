import { useApp } from '../state/AppProvider';
import { isDirty } from '../editor/documents';
import { IconClose, IconNew } from './icons';

export function TabBar({ compact = false }: { compact?: boolean }) {
  const app = useApp();
  const { buffers, activeId } = app.state;

  return (
    <div className="thin-scroll flex min-h-0 items-stretch overflow-x-auto border-b border-black/10 bg-neutral-100 dark:border-white/10 dark:bg-[#2d2d2d]">
      {buffers.map((b) => {
        const activeTab = b.id === activeId;
        const dirty = isDirty(b);
        return (
          <div
            key={b.id}
            onClick={() => app.selectFile(b.id)}
            title={b.path ? `${b.path}/${b.name}` : b.name}
            className={`group flex cursor-pointer items-center gap-2 border-r border-black/10 dark:border-white/10 ${
              compact ? 'px-2 py-1 text-[12px]' : 'px-3 py-1.5 text-[13px]'
            } ${
              activeTab
                ? 'bg-white text-neutral-900 shadow-[inset_0_2px_0_0_#2e8b57] dark:bg-[#1e1e1e] dark:text-white'
                : 'text-neutral-600 hover:bg-black/5 dark:text-neutral-400 dark:hover:bg-white/5'
            }`}
          >
            <span className="max-w-[10rem] truncate whitespace-nowrap">
              {b.name}
            </span>
            <button
              type="button"
              aria-label={dirty ? 'Unsaved changes' : `Close ${b.name}`}
              onClick={(e) => {
                e.stopPropagation();
                app.closeFile(b.id);
              }}
              className="flex h-4 w-4 items-center justify-center rounded hover:bg-black/10 dark:hover:bg-white/20"
            >
              {dirty ? (
                <span className="h-2 w-2 rounded-full bg-npp-green group-hover:hidden" />
              ) : null}
              <IconClose
                size={13}
                className={dirty ? 'hidden group-hover:block' : 'block'}
              />
            </button>
          </div>
        );
      })}
      <button
        type="button"
        aria-label="New file"
        onClick={app.newFile}
        className="flex items-center px-2 text-neutral-500 hover:text-npp-green"
      >
        <IconNew size={16} />
      </button>
    </div>
  );
}
