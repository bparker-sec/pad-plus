import { useState, type ReactNode } from 'react';
import { WidgetCard } from './WidgetCard';
import { TabBar } from '../../ui/TabBar';
import { StatusBar } from '../../ui/StatusBar';
import { Overlays } from '../../ui/Overlays';
import { SettingsPanel } from '../../ui/SettingsPanel';
import { AccountButton } from '../../ui/AccountButton';
import { BrandMark } from '../../ui/Brand';
import { LazyEditor } from '../../editor/LazyEditor';
import { useApp } from '../../state/AppProvider';
import {
  IconNew,
  IconOpen,
  IconFind,
  IconSave,
  IconSettings,
  IconFile,
} from '../../ui/icons';

type View = 'editor' | 'settings';

function NavButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] ${
        active ? 'text-npp-green' : 'text-neutral-500 dark:text-neutral-400'
      }`}
    >
      {children}
      {label}
    </button>
  );
}

/** 388×510 — mobile-style vertical stack with drill-down sub-pages. */
export function Portrait() {
  const app = useApp();
  const [view, setView] = useState<View>('editor');

  return (
    <WidgetCard>
      <div className="flex items-center gap-1.5 border-b border-black/10 px-2.5 py-1.5 dark:border-white/10">
        <BrandMark size={18} />
        <span className="text-[13px] font-semibold">Pad+</span>
        <div className="ml-auto">
          <AccountButton compact />
        </div>
      </div>

      {view === 'editor' ? (
        <>
          <TabBar compact />
          <div className="min-h-0 flex-1">
            <LazyEditor allowSplit={false} forceMinimapOff />
          </div>
          <StatusBar compact />
        </>
      ) : (
        <div className="min-h-0 flex-1">
          <SettingsPanel />
        </div>
      )}

      <nav className="flex items-stretch border-t border-black/10 dark:border-white/10">
        <NavButton
          label="New"
          onClick={() => {
            app.newFile();
            setView('editor');
          }}
        >
          <IconNew size={18} />
        </NavButton>
        <NavButton
          label="Open"
          onClick={() => app.openPicker('open')}
        >
          <IconOpen size={18} />
        </NavButton>
        <NavButton
          label="Editor"
          active={view === 'editor'}
          onClick={() => setView('editor')}
        >
          <IconFile size={18} />
        </NavButton>
        <NavButton
          label="Find"
          onClick={() => {
            setView('editor');
            app.editorAction('find');
          }}
        >
          <IconFind size={18} />
        </NavButton>
        <NavButton
          label="Save"
          onClick={() => void app.saveActive()}
        >
          <IconSave size={18} />
        </NavButton>
        <NavButton
          label="More"
          active={view === 'settings'}
          onClick={() => setView('settings')}
        >
          <IconSettings size={18} />
        </NavButton>
      </nav>

      <Overlays />
    </WidgetCard>
  );
}
