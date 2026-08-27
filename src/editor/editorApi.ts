// Monaco-free types shared between the editor pane and the rest of the app, so
// non-editor code never imports Monaco (keeps it out of the initial bundle).

export interface EditorApi {
  focus(): void;
  find(): void;
  replace(): void;
  gotoLine(): void;
  format(): void;
  commandPalette(): void;
  undo(): void;
  redo(): void;
  selectAll(): void;
  // Line operations (operate on the selection, or the whole document when there
  // is no selection, matching Notepad++'s Edit ▸ Line Operations).
  sortAsc(): void;
  sortDesc(): void;
  dedupe(): void;
  trimTrailing(): void;
  toUpper(): void;
  toLower(): void;
  toTitle(): void;
  joinLines(): void;
}

export interface CursorInfo {
  line: number;
  column: number;
  /** Number of selected characters (0 when nothing is selected). */
  selection: number;
}

export const NO_CURSOR: CursorInfo = { line: 1, column: 1, selection: 0 };
