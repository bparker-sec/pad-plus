import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';

interface MenuProps {
  trigger: ReactNode;
  align?: 'left' | 'right';
  direction?: 'up' | 'down';
  triggerClassName?: string;
  panelClassName?: string;
  ariaLabel?: string;
  children: (close: () => void) => ReactNode;
}

export function Menu({
  trigger,
  align = 'left',
  direction = 'down',
  triggerClassName = '',
  panelClassName = '',
  ariaLabel,
  children,
}: MenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const panelRef = useRef<HTMLDivElement | null>(null);

  // Focus the first item when the menu opens (keyboard access).
  useEffect(() => {
    if (!open) return;
    panelRef.current
      ?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')
      ?.focus();
  }, [open]);

  const onPanelKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const list = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not([disabled])',
      ) ?? [],
    );
    if (list.length === 0) return;
    const idx = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      list[(idx + 1 + list.length) % list.length].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      list[(idx - 1 + list.length) % list.length].focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      list[0].focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      list[list.length - 1].focus();
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {open && (
        <div
          role="menu"
          ref={panelRef}
          onKeyDown={onPanelKey}
          className={`absolute z-40 min-w-[11rem] overflow-hidden rounded-md border border-black/10 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-[#252526] ${
            direction === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'
          } ${align === 'right' ? 'right-0' : 'left-0'} ${panelClassName}`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

interface MenuItemProps {
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  shortcut?: string;
  children: ReactNode;
}

export function MenuItem({
  onClick,
  disabled,
  active,
  shortcut,
  children,
}: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-6 px-3 py-1.5 text-left text-[13px] disabled:opacity-40 ${
        active ? 'text-npp-green' : 'text-neutral-800 dark:text-neutral-200'
      } hover:bg-npp-green/10 disabled:hover:bg-transparent`}
    >
      <span className="flex items-center gap-2">{children}</span>
      {shortcut && (
        <span className="text-[11px] text-neutral-400">{shortcut}</span>
      )}
    </button>
  );
}

export function MenuSeparator() {
  return <div className="my-1 h-px bg-black/10 dark:bg-white/10" />;
}
