import type { ReactNode } from 'react';
import { useApp } from '../state/AppProvider';
import {
  IconNew,
  IconOpen,
  IconSave,
  IconSaveAs,
  IconFind,
  IconReplace,
  IconWrap,
  IconMinimap,
  IconSplit,
  IconSun,
  IconMoon,
} from './icons';

function ToolButton({
  title,
  onClick,
  active,
  disabled,
  children,
}: {
  title: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded disabled:opacity-40 ${
        active
          ? 'bg-npp-green/15 text-npp-green'
          : 'text-neutral-600 hover:bg-black/10 dark:text-neutral-300 dark:hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return (
    <div className="mx-1 h-5 w-px self-center bg-black/10 dark:bg-white/10" />
  );
}

export function Toolbar({
  allowSplit = true,
  compact = false,
}: {
  allowSplit?: boolean;
  compact?: boolean;
}) {
  const app = useApp();
  const hasActive = app.active !== null;

  return (
    <div className="flex items-center gap-0.5 border-b border-black/10 bg-neutral-100 px-1.5 py-1 dark:border-white/10 dark:bg-[#252526]">
      <ToolButton title="New file (Ctrl+N)" onClick={app.newFile}>
        <IconNew />
      </ToolButton>
      <ToolButton
        title="Open from OneDrive"
        onClick={() => app.openPicker('open')}
      >
        <IconOpen />
      </ToolButton>
      <ToolButton
        title="Save to OneDrive (Ctrl+S)"
        onClick={app.saveActive}
        disabled={!hasActive}
      >
        <IconSave />
      </ToolButton>
      {!compact && (
        <ToolButton
          title="Save As…"
          onClick={() => app.openPicker('save')}
          disabled={!hasActive}
        >
          <IconSaveAs />
        </ToolButton>
      )}

      <Divider />

      <ToolButton
        title="Find (Ctrl+F)"
        onClick={() => app.editorAction('find')}
        disabled={!hasActive}
      >
        <IconFind />
      </ToolButton>
      {!compact && (
        <ToolButton
          title="Replace (Ctrl+H)"
          onClick={() => app.editorAction('replace')}
          disabled={!hasActive}
        >
          <IconReplace />
        </ToolButton>
      )}

      <Divider />

      <ToolButton
        title="Word wrap"
        onClick={app.toggleWordWrap}
        active={app.view.wordWrap}
      >
        <IconWrap />
      </ToolButton>
      {!compact && (
        <ToolButton
          title="Minimap"
          onClick={app.toggleMinimap}
          active={app.view.minimap}
        >
          <IconMinimap />
        </ToolButton>
      )}
      {allowSplit && !compact && (
        <ToolButton
          title="Split view"
          onClick={app.toggleSplit}
          active={app.view.split}
        >
          <IconSplit />
        </ToolButton>
      )}

      <Divider />

      <ToolButton
        title={app.theme === 'dark' ? 'Light theme' : 'Dark theme'}
        onClick={app.toggleTheme}
      >
        {app.theme === 'dark' ? <IconSun /> : <IconMoon />}
      </ToolButton>
    </div>
  );
}
