import { useEffect, useRef } from 'react';
import monaco from './monacoSetup';
import { getModel, setModelEol, setModelLanguage } from './models';
import { dedupeLines, sortLines, trimTrailing } from './lineOps';
import {
  toggleBookmark as toggleBookmarkOn,
  nextBookmark,
  prevBookmark,
  clearBookmarks as clearBookmarksOn,
  getBookmarkLines,
  setBookmarkLines,
  loadBookmarks,
  saveBookmarks,
} from './bookmarks';
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
  const activeIdRef = useRef<string | null>(null);
  onChangeRef.current = onChange;
  onCursorRef.current = onCursor;
  activeIdRef.current = active?.id ?? null;

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
      glyphMargin: true,
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

      // Apply a pure line transform to the selected full lines, or the whole
      // document when nothing is selected (matches Notepad++ Line Operations).
      const lineOp = (fn: (lines: string[]) => string[]) => () => {
        const model = editor.getModel();
        if (!model) return;
        const sel = editor.getSelection();
        const hasSel = sel != null && !sel.isEmpty();
        const startLine = hasSel ? sel!.startLineNumber : 1;
        const endLine = hasSel ? sel!.endLineNumber : model.getLineCount();
        const lines: string[] = [];
        for (let l = startLine; l <= endLine; l += 1) {
          lines.push(model.getLineContent(l));
        }
        const next = fn(lines);
        if (
          next.length === lines.length &&
          next.every((v, i) => v === lines[i])
        ) {
          return; // nothing changed
        }
        const range = new monaco.Range(
          startLine,
          1,
          endLine,
          model.getLineMaxColumn(endLine),
        );
        editor.pushUndoStop();
        editor.executeEdits('lineOps', [
          { range, text: next.join(model.getEOL()) },
        ]);
        editor.pushUndoStop();
        editor.focus();
      };

      // Move the cursor to the next/previous bookmarked line.
      const gotoBookmark = (
        pick: (m: monaco.editor.ITextModel, from: number) => number | null,
      ) => {
        const model = editor.getModel();
        if (!model) return;
        const from = editor.getPosition()?.lineNumber ?? 1;
        const target = pick(model, from);
        if (target == null) return;
        editor.setPosition({ lineNumber: target, column: 1 });
        editor.revealLineInCenter(target);
        editor.focus();
      };

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
        sortAsc: lineOp((l) => sortLines(l)),
        sortDesc: lineOp((l) => sortLines(l, { descending: true })),
        dedupe: lineOp(dedupeLines),
        trimTrailing: lineOp(trimTrailing),
        toUpper: run('editor.action.transformToUppercase'),
        toLower: run('editor.action.transformToLowercase'),
        toTitle: run('editor.action.transformToTitlecase'),
        joinLines: run('editor.action.joinLines'),
        toggleBookmark: () => {
          const model = editor.getModel();
          const line = editor.getPosition()?.lineNumber;
          if (model && line) {
            toggleBookmarkOn(model, line);
            if (activeIdRef.current) {
              saveBookmarks(activeIdRef.current, getBookmarkLines(model));
            }
            editor.focus();
          }
        },
        nextBookmark: () => gotoBookmark(nextBookmark),
        prevBookmark: () => gotoBookmark(prevBookmark),
        clearBookmarks: () => {
          const model = editor.getModel();
          if (model) {
            clearBookmarksOn(model);
            if (activeIdRef.current) saveBookmarks(activeIdRef.current, []);
          }
        },
        revealLine: (line: number) => {
          editor.setPosition({ lineNumber: line, column: 1 });
          editor.revealLineInCenter(line);
          editor.focus();
        },
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
    const model = getModel(active, (id, value) =>
      onChangeRef.current(id, value),
    );
    if (editor.getModel() !== model) editor.setModel(model);
    setModelLanguage(active.id, active.language);
    setModelEol(active.id, active.eol);
    // Restore persisted bookmarks the first time this buffer's model is shown.
    if (getBookmarkLines(model).length === 0) {
      const stored = loadBookmarks(active.id);
      if (stored.length) setBookmarkLines(model, stored);
    }
    // Rebind only on identity/language/eol — not on every content edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
