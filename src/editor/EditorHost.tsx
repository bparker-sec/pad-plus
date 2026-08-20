import { useEffect } from 'react';
import MonacoPane from './MonacoPane';
import { pruneModels } from './models';
import { useApp } from '../state/AppProvider';
import { IconNew, IconCloud } from '../ui/icons';

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
  const { active, view, theme } = app;

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
