import type { ReactNode } from 'react';
import { useApp } from '../state/AppProvider';
import { AccountButton } from './AccountButton';
import { IconSaveAs, IconActivity, IconCloud } from './icons';
import { ONEDRIVE_DOCS_URL } from '../onedrive/docs';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 text-[13px]">
      <span className="text-neutral-700 dark:text-neutral-200">{label}</span>
      {children}
    </div>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={on}
      className={`relative h-5 w-9 rounded-full transition-colors ${
        on ? 'bg-npp-green' : 'bg-neutral-300 dark:bg-neutral-600'
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
          on ? 'left-[1.15rem]' : 'left-0.5'
        }`}
      />
    </button>
  );
}

export function SettingsPanel() {
  const app = useApp();
  return (
    <div className="thin-scroll h-full overflow-y-auto">
      <Row label="Dark theme">
        <Toggle on={app.theme === 'dark'} onClick={app.toggleTheme} />
      </Row>
      <Row label="Word wrap">
        <Toggle on={app.view.wordWrap} onClick={app.toggleWordWrap} />
      </Row>
      <Row label="Document map">
        <Toggle on={app.view.minimap} onClick={app.toggleMinimap} />
      </Row>
      <Row label="Font size">
        <div className="flex items-center gap-2">
          <button
            onClick={() => app.setFontSize(app.view.fontSize - 1)}
            className="h-6 w-6 rounded border border-neutral-300 dark:border-neutral-600"
          >
            −
          </button>
          <span className="w-6 text-center tabular-nums">{app.view.fontSize}</span>
          <button
            onClick={() => app.setFontSize(app.view.fontSize + 1)}
            className="h-6 w-6 rounded border border-neutral-300 dark:border-neutral-600"
          >
            +
          </button>
        </div>
      </Row>

      <div className="my-1 h-px bg-black/10 dark:bg-white/10" />

      <button
        onClick={() => app.openPicker('save')}
        disabled={!app.active}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-neutral-700 hover:bg-npp-green/10 disabled:opacity-40 dark:text-neutral-200"
      >
        <IconSaveAs size={16} /> Save As…
      </button>

      <button
        onClick={app.openDiagnostics}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-neutral-700 hover:bg-npp-green/10 dark:text-neutral-200"
      >
        <IconActivity size={16} /> OneDrive diagnostics…
      </button>

      <a
        href={ONEDRIVE_DOCS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-neutral-700 hover:bg-npp-green/10 dark:text-neutral-200"
      >
        <IconCloud size={16} /> OneDrive setup guide ↗
      </a>

      <div className="my-1 h-px bg-black/10 dark:bg-white/10" />

      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-[13px] text-neutral-700 dark:text-neutral-200">
          OneDrive
        </span>
        <AccountButton compact />
      </div>
    </div>
  );
}
