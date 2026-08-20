// Module-level Monaco model registry keyed by buffer id. Sharing models across
// editor instances gives real split-view syncing and preserves undo history when
// switching tabs.
import monaco from './monacoSetup';
import type { Buffer, Eol } from './documents';

const models = new Map<string, monaco.editor.ITextModel>();
const listeners = new Map<string, monaco.IDisposable>();

function eolSeq(eol: Eol): monaco.editor.EndOfLineSequence {
  return eol === 'CRLF'
    ? monaco.editor.EndOfLineSequence.CRLF
    : monaco.editor.EndOfLineSequence.LF;
}

export function getModel(
  buffer: Buffer,
  onChange: (id: string, value: string) => void,
): monaco.editor.ITextModel {
  let model = models.get(buffer.id);
  if (!model) {
    model = monaco.editor.createModel(buffer.content, buffer.language);
    model.setEOL(eolSeq(buffer.eol));
    models.set(buffer.id, model);
    const created = model;
    const d = created.onDidChangeContent(() => {
      onChange(buffer.id, created.getValue());
    });
    listeners.set(buffer.id, d);
  }
  return model;
}

export function setModelLanguage(id: string, language: string): void {
  const m = models.get(id);
  if (m && m.getLanguageId() !== language) {
    monaco.editor.setModelLanguage(m, language);
  }
}

export function setModelEol(id: string, eol: Eol): void {
  models.get(id)?.setEOL(eolSeq(eol));
}

export function disposeModel(id: string): void {
  listeners.get(id)?.dispose();
  listeners.delete(id);
  models.get(id)?.dispose();
  models.delete(id);
}

export function pruneModels(keepIds: Set<string>): void {
  for (const id of [...models.keys()]) {
    if (!keepIds.has(id)) disposeModel(id);
  }
}
