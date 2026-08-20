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
}

export interface CursorInfo {
  line: number;
  column: number;
  /** Number of selected characters (0 when nothing is selected). */
  selection: number;
}

export const NO_CURSOR: CursorInfo = { line: 1, column: 1, selection: 0 };
