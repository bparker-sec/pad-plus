import { useApp } from '../state/AppProvider';
import { Menu, MenuItem } from './Menu';
import { LANGUAGE_OPTIONS, languageLabel } from '../editor/languages';
import { buildTag, buildLabel } from '../buildInfo';

const cell =
  'flex items-center px-2 h-full hover:bg-white/15 whitespace-nowrap';

export function StatusBar({ compact = false }: { compact?: boolean }) {
  const app = useApp();
  const { active, cursor, view } = app;

  return (
    <div className="flex h-6 items-stretch bg-npp-green text-[11px] text-white/95">
      <div className={cell}>
        Ln {cursor.line}, Col {cursor.column}
      </div>
      {cursor.selection > 0 && (
        <div className={cell}>Sel {cursor.selection}</div>
      )}
      <div className="flex-1" />

      <div className={cell} title={`Build: ${buildLabel()}`}>
        {buildTag()}
      </div>

      {active && !compact && (
        <button
          className={cell}
          onClick={app.toggleWordWrap}
          title="Toggle word wrap"
        >
          Wrap: {view.wordWrap ? 'On' : 'Off'}
        </button>
      )}

      {active && (
        <button
          className={cell}
          title="Toggle line endings"
          onClick={() =>
            app.setEol(active.id, active.eol === 'LF' ? 'CRLF' : 'LF')
          }
        >
          {active.eol}
        </button>
      )}

      {active && !compact && (
        <div className={cell} title="File encoding">
          {active.encoding}
        </div>
      )}

      {active && (
        <Menu
          direction="up"
          align="right"
          ariaLabel="Select language"
          triggerClassName={cell}
          trigger={<span>{languageLabel(active.language)}</span>}
        >
          {(close) => (
            <div className="thin-scroll max-h-72 overflow-y-auto">
              {LANGUAGE_OPTIONS.map((opt) => (
                <MenuItem
                  key={opt.id}
                  active={opt.id === active.language}
                  onClick={() => {
                    app.setLanguage(active.id, opt.id);
                    close();
                  }}
                >
                  {opt.label}
                </MenuItem>
              ))}
            </div>
          )}
        </Menu>
      )}
    </div>
  );
}
