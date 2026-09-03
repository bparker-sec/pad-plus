import { useApp } from '../state/AppProvider';
import { BrandMark } from './Brand';
import { IconClose } from './icons';
import { useModalA11y } from './useModalA11y';
import { buildLabel } from '../buildInfo';
import {
  REPO_URL,
  LICENSE_URL,
  CHANGELOG_URL,
  bugReportUrl,
  openExternal,
} from '../links';

/** About & License — the app's licensing page (View ▸ About & License, and the
 * Help menu). Shows version/build, the GPLv3 notice, and source/bug links. */
export function AboutModal() {
  const app = useApp();
  const dialogRef = useModalA11y(app.aboutOpen, app.closeAbout);
  if (!app.aboutOpen) return null;

  const linkClass = 'text-npp-green underline hover:text-npp-greenDark';

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 p-3"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) app.closeAbout();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="About and license"
        tabIndex={-1}
        className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-lg border border-black/10 bg-white shadow-2xl outline-none dark:border-white/10 dark:bg-[#252526]"
      >
        <div className="flex items-center gap-2 border-b border-black/10 px-3 py-2 dark:border-white/10">
          <BrandMark size={18} />
          <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
            About Pad+
          </span>
          <button
            aria-label="Close"
            onClick={app.closeAbout}
            className="ml-auto rounded p-1 text-neutral-500 hover:bg-black/10 dark:hover:bg-white/10"
          >
            <IconClose size={16} />
          </button>
        </div>

        <div className="thin-scroll flex-1 overflow-y-auto px-4 py-3 text-[13px] leading-relaxed text-neutral-700 dark:text-neutral-200">
          <p className="mb-2">
            <strong>Pad+</strong> — a fast, client-side code &amp; text editor
            that stores your files in Microsoft OneDrive.
          </p>
          <p className="mb-3 text-[12px] text-neutral-500">{buildLabel()}</p>

          <h3 className="mb-1 mt-3 text-[13px] font-semibold text-neutral-800 dark:text-neutral-100">
            License
          </h3>
          <p className="mb-1">
            Pad+ is free software licensed under the{' '}
            <a
              href={LICENSE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              GNU General Public License v3.0
            </a>
            . You may use, study, share, and modify it under those terms; it is
            distributed WITHOUT ANY WARRANTY.
          </p>
          <p className="mb-3 text-[12px] text-neutral-500">
            Built with React and Microsoft&rsquo;s Monaco editor (MIT).
            &ldquo;Microsoft&rdquo; and &ldquo;OneDrive&rdquo; are trademarks of
            Microsoft; Pad+ is not affiliated with or endorsed by Microsoft.
          </p>

          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              Source code ↗
            </a>
            <a
              href={CHANGELOG_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              Changelog ↗
            </a>
            <button
              onClick={() => openExternal(bugReportUrl())}
              className={linkClass}
            >
              Report a bug ↗
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
