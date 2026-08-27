// Line bookmarks implemented as Monaco model decorations. Because decorations
// live on the shared model (see models.ts), bookmarks persist across tab
// switches and split panes automatically, and track their line as text is
// edited above them.
import monaco from './monacoSetup';

const CLASS = 'npp-bookmark-glyph';

type Model = monaco.editor.ITextModel;

function options(): monaco.editor.IModelDecorationOptions {
  return {
    glyphMarginClassName: CLASS,
    glyphMarginHoverMessage: { value: 'Bookmark' },
    stickiness:
      monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
    overviewRuler: {
      color: '#3fb950',
      position: monaco.editor.OverviewRulerLane.Left,
    },
  };
}

/** Sorted line numbers that currently carry a bookmark. */
export function getBookmarkLines(model: Model): number[] {
  return model
    .getAllDecorations()
    .filter((d) => d.options.glyphMarginClassName === CLASS)
    .map((d) => d.range.startLineNumber)
    .sort((a, b) => a - b);
}

/** Add or remove a bookmark on the given line. */
export function toggleBookmark(model: Model, line: number): void {
  const existing = model
    .getLineDecorations(line)
    .find((d) => d.options.glyphMarginClassName === CLASS);
  if (existing) {
    model.deltaDecorations([existing.id], []);
  } else {
    model.deltaDecorations(
      [],
      [{ range: new monaco.Range(line, 1, line, 1), options: options() }],
    );
  }
}

export function clearBookmarks(model: Model): void {
  const ids = model
    .getAllDecorations()
    .filter((d) => d.options.glyphMarginClassName === CLASS)
    .map((d) => d.id);
  if (ids.length) model.deltaDecorations(ids, []);
}

/** Next bookmarked line after `fromLine`, wrapping; null if there are none. */
export function nextBookmark(model: Model, fromLine: number): number | null {
  const lines = getBookmarkLines(model);
  if (!lines.length) return null;
  return lines.find((l) => l > fromLine) ?? lines[0];
}

/** Previous bookmarked line before `fromLine`, wrapping; null if there are none. */
export function prevBookmark(model: Model, fromLine: number): number | null {
  const lines = getBookmarkLines(model);
  if (!lines.length) return null;
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (lines[i] < fromLine) return lines[i];
  }
  return lines[lines.length - 1];
}
