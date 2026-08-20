import { lazy, Suspense } from 'react';
import type { EditorHostProps } from './EditorHost';

const EditorHost = lazy(() => import('./EditorHost'));

function EditorLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-white text-sm text-neutral-500 dark:bg-[#1e1e1e] dark:text-neutral-400">
      <span className="animate-pulse">Loading editor…</span>
    </div>
  );
}

/** Suspense-wrapped editor. Loads Monaco on demand, shared across all layouts. */
export function LazyEditor(props: EditorHostProps) {
  return (
    <Suspense fallback={<EditorLoading />}>
      <EditorHost {...props} />
    </Suspense>
  );
}
