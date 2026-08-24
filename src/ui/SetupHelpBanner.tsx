import { useApp } from '../state/AppProvider';
import { ONEDRIVE_DOCS_URL, ONEDRIVE_DOCS_LABEL } from '../onedrive/docs';
import { IconClose, IconCloud } from './icons';

/**
 * Appears when OneDrive returns "not connected for this app", prompting the user
 * to Island's setup guide. Rendered inside the layout root (Overlays), so it
 * stays clipped within the widget card.
 */
export function SetupHelpBanner() {
  const app = useApp();
  if (!app.setupHelpVisible) return null;
  return (
    <div className="absolute inset-x-0 bottom-0 z-40 border-t border-amber-300 bg-amber-50 px-3 py-2 text-[12px] text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/70 dark:text-amber-100">
      <div className="flex items-start gap-2">
        <IconCloud size={15} className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <span className="font-medium">
            OneDrive isn’t connected for this app yet.
          </span>{' '}
          Configure the OneDrive integration in Island, then retry.{' '}
          <a
            href={ONEDRIVE_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline"
          >
            {ONEDRIVE_DOCS_LABEL} ↗
          </a>
          <div className="mt-0.5 break-all text-[11px] opacity-70">
            {ONEDRIVE_DOCS_URL}
          </div>
        </div>
        <button
          aria-label="Dismiss"
          onClick={app.dismissSetupHelp}
          className="shrink-0 rounded p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
        >
          <IconClose size={14} />
        </button>
      </div>
    </div>
  );
}
