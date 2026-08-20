import { useEffect, useRef } from 'react';
import { useApp } from './AppProvider';

/** Global Notepad++-style shortcuts. Editor-local ones (Find/Replace/Go-to-line)
 * are handled by Monaco when the editor is focused. */
export function useShortcuts() {
  const app = useApp();
  const ref = useRef(app);
  ref.current = app;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const a = ref.current;
      switch (e.key.toLowerCase()) {
        case 's':
          e.preventDefault();
          void a.saveActive();
          break;
        case 'n':
          e.preventDefault();
          a.newFile();
          break;
        case 'o':
          e.preventDefault();
          a.openPicker('open');
          break;
        case 'w':
          if (a.active) {
            e.preventDefault();
            a.closeFile(a.active.id);
          }
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);
}
