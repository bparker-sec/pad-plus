import { useEffect } from 'react';
import MonacoPane from './MonacoPane';
import DiffPane from './DiffPane';
import { pruneModels } from './models';
import { useApp } from '../state/AppProvider';
import { IconNew, IconCloud, IconClose } from '../ui/icons';

export interface EditorHostProps {
  allowSplit?: boolean;
  forceMinimapOff?: boolean;
  compact?: boolean;
}

/**
 * The lazy Monaco boundary. Every layout renders this; loading it dynamically
 * keeps the ~3MB editor out of the initial shell chunk.
 */
export default function EditorHost({
  allowSplit = true,
  forceMinimapOff = false,
  compact = false,
}: EditorHostProps) {
  const app = useApp();
  const { active, view, theme, compareWith } = app;

  // Dispose Monaco models for buffers that have been closed.
  useEffect(() => {
    pruneModels(new Set(app.state.buffers.map((b) => b.id)));
  }, [app.state.buffers]);

  if (!active) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-white text-neutral-500 dark:bg-[#1e1e1e] dark:text-neutral-400">
        <p className="text-sm">No file open</p>
        <div className="flex gap-2">
          <button
            onClick={app.newFile}
            className="flex items-center gap-1.5 rounded-md bg-npp-green px-3 py-1.5 text-sm text-white hover:bg-npp-greenDark"
          >
            <IconNew size={15} /> New file
          </button>
          <button
            onClick={() => app.openPicker('open')}
            className="flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:border-neutral-600 dark:hover:bg-neutral-800"
          >
            <IconCloud size={15} /> Open from OneDrive
          </button>
        </div>
      </div>
    );
  }

  // Compare mode: diff the active tab against another open tab.
  const other =
    compareWith != null
      ? (app.state.buffers.find((b) => b.id === compareWith) ?? null)
      : null;
  if (other && other.id !== active.id) {
    return (
      <div className="flex h-full w-full flex-col">
        <div className="flex items-center gap-2 border-b border-black/10 bg-neutral-100 px-3 py-1 text-[12px] text-neutral-600 dark:border-white/10 dark:bg-[#252526] dark:text-neutral-300">
          <span className="truncate">
            Comparing <span className="font-medium">{other.name}</span> ↔{' '}
            <span className="font-medium">{active.name}</span>
          </span>
          <button
            onClick={app.stopCompare}
            className="ml-auto flex items-center gap-1 rounded px-2 py-0.5 hover:bg-black/10 dark:hover:bg-white/10"
          >
            <IconClose size={13} /> Close Compare
          </button>
        </div>
        <div className="min-h-0 flex-1">
          <DiffPane
            original={other}
            modified={active}
            theme={theme}
            onChange={app.updateContent}
          />
        </div>
      </div>
    );
  }

  const minimap = forceMinimapOff ? false : view.minimap;
  const split = allowSplit && view.split;
  const fontSize = compact ? Math.min(view.fontSize, 12) : view.fontSize;

  return (
    <div className="flex h-full w-full">
      <div className="h-full min-w-0 flex-1">
        <MonacoPane
          primary
          active={active}
          theme={theme}
          minimap={minimap}
          wordWrap={view.wordWrap}
          fontSize={fontSize}
          onChange={app.updateContent}
          onCursor={app.setCursor}
          onReady={app.registerEditor}
        />
      </div>
      {split && (
        <div className="h-full min-w-0 flex-1 border-l border-black/10 dark:border-white/10">
          <MonacoPane
            active={active}
            theme={theme}
            minimap={false}
            wordWrap={view.wordWrap}
            fontSize={fontSize}
            onChange={app.updateContent}
          />
        </div>
      )}
    </div>
  );
}
