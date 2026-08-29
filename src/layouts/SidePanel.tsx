import { Toolbar } from '../ui/Toolbar';
import { TabBar } from '../ui/TabBar';
import { StatusBar } from '../ui/StatusBar';
import { Overlays } from '../ui/Overlays';
import { AccountButton } from '../ui/AccountButton';
import { BrandMark } from '../ui/Brand';
import { LazyEditor } from '../editor/LazyEditor';

export function SidePanel() {
  return (
    <div className="relative flex h-full w-full flex-col bg-neutral-50 text-neutral-900 dark:bg-[#1e1e1e] dark:text-neutral-100">
      <div className="flex items-center gap-1.5 border-b border-black/10 px-2 py-1.5 dark:border-white/10">
        <BrandMark size={18} />
        <span className="text-[13px] font-semibold">Pad+</span>
        <div className="ml-auto">
          <AccountButton compact />
        </div>
      </div>
      <Toolbar compact allowSplit={false} />
      <TabBar compact />
      <div className="min-h-0 flex-1">
        <LazyEditor allowSplit={false} />
      </div>
      <StatusBar compact />
      <Overlays />
    </div>
  );
}
