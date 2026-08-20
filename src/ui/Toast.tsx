import { useApp } from '../state/AppProvider';

export function Toast() {
  const { toast } = useApp();
  if (!toast) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-8 z-50 flex justify-center px-4">
      <div className="pointer-events-auto max-w-[90%] truncate rounded-md bg-neutral-900/90 px-3 py-1.5 text-[12px] text-white shadow-lg dark:bg-white/90 dark:text-neutral-900">
        {toast}
      </div>
    </div>
  );
}
