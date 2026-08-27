import { useEffect, useRef } from 'react';
import monaco from './monacoSetup';
import { getModel } from './models';
import type { Buffer } from './documents';

export interface DiffPaneProps {
  original: Buffer;
  modified: Buffer;
  theme: 'light' | 'dark';
  onChange: (id: string, value: string) => void;
}

/** Side-by-side diff of two open buffers using Monaco's diff editor. The
 * original (left) is read-only; edits on the right propagate to that buffer. */
export default function DiffPane({
  original,
  modified,
  theme,
  onChange,
}: DiffPaneProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const diff = monaco.editor.createDiffEditor(host, {
      theme: theme === 'dark' ? 'npp-dark' : 'npp-light',
      automaticLayout: true,
      originalEditable: false,
      readOnly: false,
      renderSideBySide: true,
      ignoreTrimWhitespace: false,
      fontSize: 14,
      fontFamily: "'Consolas','Menlo','Monaco','Courier New',monospace",
    });
    // Both are open tabs, so getModel returns their existing shared models
    // (the onChange is only used if a model must be created).
    diff.setModel({
      original: getModel(original, onChange),
      modified: getModel(modified, onChange),
    });
    return () => diff.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [original.id, modified.id]);

  useEffect(() => {
    monaco.editor.setTheme(theme === 'dark' ? 'npp-dark' : 'npp-light');
  }, [theme]);

  return <div ref={hostRef} className="h-full w-full" />;
}
