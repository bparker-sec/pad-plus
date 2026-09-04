import { useApp } from '../state/AppProvider';
import { Menu, MenuItem, MenuSeparator } from './Menu';
import { AccountButton } from './AccountButton';
import { BrandMark } from './Brand';
import { LANGUAGE_OPTIONS } from '../editor/languages';
import { ENCODINGS, encodingLabel } from '../editor/encodings';
import { bugReportUrl, openExternal } from '../links';
import { ONEDRIVE_DOCS_URL } from '../onedrive/docs';
import { buildTag, buildLabel } from '../buildInfo';

const topTrigger =
  'app-no-drag rounded px-2 py-1 text-[13px] text-neutral-700 hover:bg-black/10 dark:text-neutral-200 dark:hover:bg-white/10';

export function MenuBar() {
  const app = useApp();
  const hasActive = app.active !== null;

  return (
    <div className="app-drag flex items-center gap-1 border-b border-black/10 bg-neutral-100 px-2 py-1 dark:border-white/10 dark:bg-[#323233]">
      <div className="app-no-drag flex select-none items-center gap-1.5 pl-1 pr-2 font-semibold text-neutral-800 dark:text-neutral-100">
        <BrandMark />
        <span className="text-[13px]">Pad+</span>
        <span
          className="font-normal text-[10px] text-neutral-400"
          title={`Build: ${buildLabel()}`}
        >
          {buildTag()}
        </span>
      </div>

      {/* File */}
      <Menu triggerClassName={topTrigger} trigger="File">
        {(close) => (
          <>
            <MenuItem
              shortcut="Ctrl+N"
              onClick={() => {
                app.newFile();
                close();
              }}
            >
              New
            </MenuItem>
            <MenuItem
              onClick={() => {
                app.openPicker('open');
                close();
              }}
            >
              Open from OneDrive…
            </MenuItem>
            <MenuSeparator />
            <MenuItem
              shortcut="Ctrl+S"
              disabled={!hasActive}
              onClick={() => {
                void app.saveActive();
                close();
              }}
            >
              Save
            </MenuItem>
            <MenuItem
              disabled={!hasActive}
              onClick={() => {
                app.openPicker('save');
                close();
              }}
            >
              Save As…
            </MenuItem>
            <MenuSeparator />
            <MenuItem
              onClick={() => {
                app.openSessions();
                close();
              }}
            >
              Sessions…
            </MenuItem>
            <MenuSeparator />
            <MenuItem
              shortcut="Ctrl+W"
              disabled={!hasActive}
              onClick={() => {
                if (app.active) app.closeFile(app.active.id);
                close();
              }}
            >
              Close
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Edit */}
      <Menu triggerClassName={topTrigger} trigger="Edit">
        {(close) => (
          <>
            <MenuItem
              shortcut="Ctrl+Z"
              disabled={!hasActive}
              onClick={() => {
                app.editorAction('undo');
                close();
              }}
            >
              Undo
            </MenuItem>
            <MenuItem
              shortcut="Ctrl+Y"
              disabled={!hasActive}
              onClick={() => {
                app.editorAction('redo');
                close();
              }}
            >
              Redo
            </MenuItem>
            <MenuSeparator />
            <MenuItem
              shortcut="Ctrl+F"
              disabled={!hasActive}
              onClick={() => {
                app.editorAction('find');
                close();
              }}
            >
              Find
            </MenuItem>
            <MenuItem
              shortcut="Ctrl+H"
              disabled={!hasActive}
              onClick={() => {
                app.editorAction('replace');
                close();
              }}
            >
              Replace
            </MenuItem>
            <MenuItem
              shortcut="Ctrl+G"
              disabled={!hasActive}
              onClick={() => {
                app.editorAction('gotoLine');
                close();
              }}
            >
              Go to Line…
            </MenuItem>
            <MenuSeparator />
            <MenuItem
              shortcut="Ctrl+A"
              disabled={!hasActive}
              onClick={() => {
                app.editorAction('selectAll');
                close();
              }}
            >
              Select All
            </MenuItem>
            <MenuSeparator />
            <MenuItem
              disabled={!hasActive}
              onClick={() => {
                app.editorAction('sortAsc');
                close();
              }}
            >
              Sort Lines Ascending
            </MenuItem>
            <MenuItem
              disabled={!hasActive}
              onClick={() => {
                app.editorAction('sortDesc');
                close();
              }}
            >
              Sort Lines Descending
            </MenuItem>
            <MenuItem
              disabled={!hasActive}
              onClick={() => {
                app.editorAction('dedupe');
                close();
              }}
            >
              Remove Duplicate Lines
            </MenuItem>
            <MenuItem
              disabled={!hasActive}
              onClick={() => {
                app.editorAction('trimTrailing');
                close();
              }}
            >
              Trim Trailing Whitespace
            </MenuItem>
            <MenuItem
              disabled={!hasActive}
              onClick={() => {
                app.editorAction('joinLines');
                close();
              }}
            >
              Join Lines
            </MenuItem>
            <MenuSeparator />
            <MenuItem
              disabled={!hasActive}
              onClick={() => {
                app.editorAction('toUpper');
                close();
              }}
            >
              UPPERCASE
            </MenuItem>
            <MenuItem
              disabled={!hasActive}
              onClick={() => {
                app.editorAction('toLower');
                close();
              }}
            >
              lowercase
            </MenuItem>
            <MenuItem
              disabled={!hasActive}
              onClick={() => {
                app.editorAction('toTitle');
                close();
              }}
            >
              Title Case
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Search */}
      <Menu triggerClassName={topTrigger} trigger="Search">
        {(close) => (
          <>
            <MenuItem
              onClick={() => {
                app.openFind();
                close();
              }}
            >
              Find in Files…
            </MenuItem>
            <MenuSeparator />
            <MenuItem
              disabled={!hasActive}
              onClick={() => {
                app.editorAction('toggleBookmark');
                close();
              }}
            >
              Toggle Bookmark
            </MenuItem>
            <MenuItem
              disabled={!hasActive}
              onClick={() => {
                app.editorAction('nextBookmark');
                close();
              }}
            >
              Next Bookmark
            </MenuItem>
            <MenuItem
              disabled={!hasActive}
              onClick={() => {
                app.editorAction('prevBookmark');
                close();
              }}
            >
              Previous Bookmark
            </MenuItem>
            <MenuItem
              disabled={!hasActive}
              onClick={() => {
                app.editorAction('clearBookmarks');
                close();
              }}
            >
              Clear All Bookmarks
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Tools */}
      <Menu triggerClassName={topTrigger} trigger="Tools">
        {(close) => {
          const others = app.state.buffers.filter(
            (b) => b.id !== app.active?.id,
          );
          if (app.compareWith) {
            return (
              <MenuItem
                onClick={() => {
                  app.stopCompare();
                  close();
                }}
              >
                Close Compare
              </MenuItem>
            );
          }
          if (others.length === 0) {
            return <MenuItem disabled>Open two files to compare</MenuItem>;
          }
          return (
            <>
              <div className="px-3 py-1 text-[11px] uppercase tracking-wide text-neutral-400">
                Compare current with
              </div>
              {others.map((b) => (
                <MenuItem
                  key={b.id}
                  onClick={() => {
                    app.startCompare(b.id);
                    close();
                  }}
                >
                  {b.name}
                </MenuItem>
              ))}
            </>
          );
        }}
      </Menu>

      {/* View */}
      <Menu triggerClassName={topTrigger} trigger="View">
        {(close) => (
          <>
            <MenuItem
              active={app.view.wordWrap}
              onClick={() => {
                app.toggleWordWrap();
                close();
              }}
            >
              Word Wrap
            </MenuItem>
            <MenuItem
              active={app.view.minimap}
              onClick={() => {
                app.toggleMinimap();
                close();
              }}
            >
              Document Map (Minimap)
            </MenuItem>
            <MenuItem
              active={app.view.split}
              onClick={() => {
                app.toggleSplit();
                close();
              }}
            >
              Split View
            </MenuItem>
            <MenuItem
              active={app.view.outline}
              onClick={() => {
                app.toggleOutline();
                close();
              }}
            >
              Function List
            </MenuItem>
            <MenuSeparator />
            <MenuItem
              active={app.persistEnabled}
              onClick={() => {
                app.setPersistEnabled(!app.persistEnabled);
                close();
              }}
            >
              Persist Unsaved Files
            </MenuItem>
            <MenuSeparator />
            <MenuItem
              onClick={() => {
                app.editorAction('format');
                close();
              }}
              disabled={!hasActive}
            >
              Format Document
            </MenuItem>
            <MenuItem
              onClick={() => {
                app.toggleTheme();
                close();
              }}
            >
              Toggle {app.theme === 'dark' ? 'Light' : 'Dark'} Theme
            </MenuItem>
            <MenuSeparator />
            <MenuItem
              onClick={() => {
                window.open(ONEDRIVE_DOCS_URL, '_blank', 'noopener,noreferrer');
                close();
              }}
            >
              OneDrive setup guide ↗
            </MenuItem>
            <MenuSeparator />
            <MenuItem
              onClick={() => {
                app.openAbout();
                close();
              }}
            >
              About &amp; License…
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Encoding */}
      <Menu triggerClassName={topTrigger} trigger="Encoding">
        {(close) => (
          <>
            {ENCODINGS.map((enc) => (
              <MenuItem
                key={enc}
                disabled={!hasActive}
                active={app.active?.encoding === enc}
                onClick={() => {
                  if (app.active) app.setEncoding(app.active.id, enc);
                  close();
                }}
              >
                {encodingLabel(enc)}
              </MenuItem>
            ))}
          </>
        )}
      </Menu>

      {/* Language */}
      <Menu triggerClassName={topTrigger} trigger="Language">
        {(close) => (
          <div className="thin-scroll max-h-80 overflow-y-auto">
            {LANGUAGE_OPTIONS.map((opt) => (
              <MenuItem
                key={opt.id}
                disabled={!hasActive}
                active={app.active?.language === opt.id}
                onClick={() => {
                  if (app.active) app.setLanguage(app.active.id, opt.id);
                  close();
                }}
              >
                {opt.label}
              </MenuItem>
            ))}
          </div>
        )}
      </Menu>

      {/* Help */}
      <Menu triggerClassName={topTrigger} trigger="Help">
        {(close) => (
          <>
            <MenuItem
              onClick={() => {
                app.openHelp();
                close();
              }}
            >
              Help…
            </MenuItem>
            <MenuItem
              onClick={() => {
                openExternal(bugReportUrl());
                close();
              }}
            >
              Report a bug ↗
            </MenuItem>
            <MenuSeparator />
            <MenuItem
              onClick={() => {
                app.openAbout();
                close();
              }}
            >
              About &amp; License…
            </MenuItem>
          </>
        )}
      </Menu>

      <div className="flex-1" />
      <div className="app-no-drag">
        <AccountButton />
      </div>
    </div>
  );
}
