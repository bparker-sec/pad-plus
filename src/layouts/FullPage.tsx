import { MenuBar } from '../ui/MenuBar';
import { Toolbar } from '../ui/Toolbar';
import { TabBar } from '../ui/TabBar';
import { StatusBar } from '../ui/StatusBar';
import { Overlays } from '../ui/Overlays';
import { LazyEditor } from '../editor/LazyEditor';

export function FullPage() {
  return (
    <div className="relative flex h-full w-full flex-col bg-neutral-50 text-neutral-900 dark:bg-[#1e1e1e] dark:text-neutral-100">
      <MenuBar />
      <Toolbar />
      <TabBar />
      <div className="min-h-0 flex-1">
        <LazyEditor allowSplit />
      </div>
      <StatusBar />
      <Overlays />
    </div>
  );
}
