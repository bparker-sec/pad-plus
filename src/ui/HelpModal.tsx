import { useApp } from '../state/AppProvider';
import { IconClose } from './icons';
import { useModalA11y } from './useModalA11y';
import { REPO_URL, bugReportUrl, openExternal } from '../links';

const SHORTCUTS: [string, string][] = [
  ['Ctrl+N', 'New file'],
  ['Ctrl+S', 'Save (to OneDrive)'],
  ['Ctrl+W', 'Close tab'],
  ['Ctrl+F', 'Find'],
  ['Ctrl+H', 'Replace'],
  ['Ctrl+G', 'Go to line'],
  ['Ctrl+Z / Ctrl+Y', 'Undo / Redo'],
  ['Ctrl+A', 'Select all'],
];

const TIPS: [string, string][] = [
  ['File', 'New, Open/Save to OneDrive, Save As (smart file type), Sessions'],
  ['Edit', 'Line Operations: sort, dedupe, trim, join, change case'],
  ['Search', 'Find in Files (tabs or OneDrive), Replace, Bookmarks'],
  ['View', 'Word wrap, Function List, Split view, theme, About & License'],
  ['Tools', 'Compare the current tab against another open tab'],
  ['Encoding / Language', 'Convert encoding on save; set syntax highlighting'],
];

/** Help — a quick overview, keyboard shortcuts, and a bug-report link. */
export function HelpModal() {
  const app = useApp();
  const dialogRef = useModalA11y(app.helpOpen, app.closeHelp);
  if (!app.helpOpen) return null;

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 p-3"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) app.closeHelp();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Help"
        tabIndex={-1}
        className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-lg border border-black/10 bg-white shadow-2xl outline-none dark:border-white/10 dark:bg-[#252526]"
      >
        <div className="flex items-center gap-2 border-b border-black/10 px-3 py-2 dark:border-white/10">
          <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
            Help
          </span>
          <button
            aria-label="Close"
            onClick={app.closeHelp}
            className="ml-auto rounded p-1 text-neutral-500 hover:bg-black/10 dark:hover:bg-white/10"
          >
            <IconClose size={16} />
          </button>
        </div>

        <div className="thin-scroll flex-1 overflow-y-auto px-4 py-3 text-[13px] leading-relaxed text-neutral-700 dark:text-neutral-200">
          <p className="mb-3">
            Pad+ is a code &amp; text editor that keeps your files in Microsoft
            OneDrive. Connect OneDrive from the toolbar or <em>File ▸ Open</em>,
            then edit across tabs; new files live in the browser until you save.
          </p>

          <h3 className="mb-1 text-[13px] font-semibold text-neutral-800 dark:text-neutral-100">
            Where things are
          </h3>
          <ul className="mb-3 space-y-0.5">
            {TIPS.map(([menu, what]) => (
              <li key={menu}>
                <span className="font-medium">{menu}:</span> {what}
              </li>
            ))}
          </ul>

          <h3 className="mb-1 text-[13px] font-semibold text-neutral-800 dark:text-neutral-100">
            Keyboard shortcuts
          </h3>
          <table className="mb-1 w-full text-[12px]">
            <tbody>
              {SHORTCUTS.map(([keys, what]) => (
                <tr key={keys}>
                  <td className="py-0.5 pr-3 font-mono text-neutral-500">
                    {keys}
                  </td>
                  <td className="py-0.5">{what}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[12px] text-neutral-500">
            Editor extras (multi-cursor, column select, folding, command
            palette) come from the Monaco editor.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-black/10 px-3 py-2 dark:border-white/10">
          <button
            onClick={() => openExternal(bugReportUrl())}
            className="rounded-md bg-npp-green px-3 py-1 text-[13px] text-white hover:bg-npp-greenDark"
          >
            Report a bug ↗
          </button>
          <button
            onClick={() => openExternal(REPO_URL)}
            className="rounded-md border border-neutral-300 px-3 py-1 text-[13px] hover:bg-black/5 dark:border-neutral-600 dark:hover:bg-white/5"
          >
            Source on GitHub ↗
          </button>
          <button
            onClick={() => {
              app.closeHelp();
              app.openAbout();
            }}
            className="ml-auto rounded-md px-3 py-1 text-[13px] text-neutral-500 hover:bg-black/5 dark:hover:bg-white/5"
          >
            About &amp; License
          </button>
        </div>
      </div>
    </div>
  );
}
