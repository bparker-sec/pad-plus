import type { ReactNode } from 'react';

/**
 * The widget root IS the card. Exactly border-radius:24px + overflow:hidden,
 * position:relative so overlays clip inside it. No wrapper exists outside this
 * element in widget mode.
 */
export function WidgetCard({ children }: { children: ReactNode }) {
  return (
    <div
      style={{ borderRadius: 24, overflow: 'hidden' }}
      className="relative flex h-full w-full flex-col bg-neutral-50 text-neutral-900 dark:bg-[#1e1e1e] dark:text-neutral-100"
    >
      {children}
    </div>
  );
}
