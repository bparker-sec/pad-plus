import { useApp } from '../state/AppProvider';
import { Menu, MenuItem, MenuSeparator } from './Menu';
import { IconCloud, IconSignOut } from './icons';

function initials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
}

export function AccountButton({ compact = false }: { compact?: boolean }) {
  const app = useApp();

  if (!app.signedIn) {
    return (
      <button
        type="button"
        onClick={app.signIn}
        className="flex items-center gap-1.5 rounded-md bg-npp-green px-2.5 py-1 text-[12px] font-medium text-white hover:bg-npp-greenDark"
      >
        <IconCloud size={14} />
        {compact ? 'Connect' : 'Connect OneDrive'}
      </button>
    );
  }

  const label = app.user?.displayName || app.user?.name || app.user?.email || 'Account';

  return (
    <Menu
      align="right"
      ariaLabel="Account menu"
      triggerClassName="flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-black/10 dark:hover:bg-white/10"
      trigger={
        <>
          {app.user?.picture ? (
            <img
              src={app.user.picture}
              alt=""
              className="h-6 w-6 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-npp-green text-[11px] font-semibold uppercase text-white">
              {initials(label)}
            </span>
          )}
          {!compact && (
            <span className="max-w-[9rem] truncate text-[12px] text-neutral-700 dark:text-neutral-200">
              {label}
            </span>
          )}
        </>
      }
    >
      {(close) => (
        <>
          <div className="px-3 py-2 text-[12px] text-neutral-500">
            <div className="font-medium text-neutral-800 dark:text-neutral-100">
              {label}
            </div>
            {app.user?.email && <div className="truncate">{app.user.email}</div>}
          </div>
          <MenuSeparator />
          <MenuItem
            onClick={() => {
              void app.signOut();
              close();
            }}
          >
            <IconSignOut size={15} /> Sign out of OneDrive
          </MenuItem>
        </>
      )}
    </Menu>
  );
}
