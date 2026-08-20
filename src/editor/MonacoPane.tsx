import { useEffect, useRef } from 'react';
import monaco from './monacoSetup';
import { getModel, setModelEol, setModelLanguage } from './models';
import type { Buffer } from './documents';
import type { CursorInfo, EditorApi } from './editorApi';

export interface MonacoPaneProps {
  active: Buffer | null;
  theme: 'light' | 'dark';
  minimap: boolean;
  wordWrap: boolean;
  fontSize: number;
  readOnly?: boolean;
  /** Only the primary pane reports cursor state and registers the editor API. */
  primary?: boolean;
  onChange: (id: string, content: string) => void;
  onCursor?: (info: CursorInfo) => void;
  onReady?: (api: EditorApi) => void;
}

export default function MonacoPane({
  active,
  theme,
  minimap,
  wordWrap,
  fontSize,
  readOnly = false,
  primary = false,
  onChange,
  onCursor,
  onReady,
}: MonacoPaneProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const onChangeRef = useRef(onChange);
  const onCursorRef = useRef(onCursor);
  onChangeRef.current = onChange;
  onCursorRef.current = onCursor;

  // Create the editor once.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const editor = monaco.editor.create(host, {
      theme: theme === 'dark' ? 'npp-dark' : 'npp-light',
      automaticLayout: true,
      fontSize,
      fontFamily: "'Consolas','Menlo','Monaco','Courier New',monospace",
      minimap: { enabled: minimap },
      wordWrap: wordWrap ? 'on' : 'off',
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      renderWhitespace: 'selection',
      smoothScrolling: true,
      tabSize: 4,
      readOnly,
      bracketPairColorization: { enabled: true },
      fixedOverflowWidgets: true,
    });
    editorRef.current = editor;

    const report = () => {
      if (!primary) return;
      const pos = editor.getPosition();
      const sel = editor.getSelection();
      const model = editor.getModel();
      const selection = sel && model ? model.getValueLengthInRange(sel) : 0;
      onCursorRef.current?.({
        line: pos?.lineNumber ?? 1,
        column: pos?.column ?? 1,
        selection,
      });
    };
    const posD = editor.onDidChangeCursorPosition(report);
    const selD = editor.onDidChangeCursorSelection(report);

    if (primary) {
      const run = (id: string) => () => void editor.getAction(id)?.run();
      const api: EditorApi = {
        focus: () => editor.focus(),
        find: run('actions.find'),
        replace: run('editor.action.startFindReplaceAction'),
        gotoLine: run('editor.action.gotoLine'),
        format: run('editor.action.formatDocument'),
        commandPalette: run('editor.action.quickCommand'),
        selectAll: run('editor.action.selectAll'),
        undo: () => editor.trigger('menu', 'undo', null),
        redo: () => editor.trigger('menu', 'redo', null),
      };
      onReady?.(api);
    }

    return () => {
      posD.dispose();
      selD.dispose();
      editor.dispose();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bind the active buffer's shared model.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (!active) {
      editor.setModel(null);
      return;
    }
    const model = getModel(active, (id, value) => onChangeRef.current(id, value));
    if (editor.getModel() !== model) editor.setModel(model);
    setModelLanguage(active.id, active.language);
    setModelEol(active.id, active.eol);
  }, [active?.id, active?.language, active?.eol]);

  // React to view-option changes.
  useEffect(() => {
    editorRef.current?.updateOptions({
      minimap: { enabled: minimap },
      wordWrap: wordWrap ? 'on' : 'off',
      fontSize,
      readOnly,
    });
  }, [minimap, wordWrap, fontSize, readOnly]);

  useEffect(() => {
    monaco.editor.setTheme(theme === 'dark' ? 'npp-dark' : 'npp-light');
  }, [theme]);

  return <div ref={hostRef} className="h-full w-full" />;
}
