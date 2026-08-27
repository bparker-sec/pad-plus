import { MenuBar } from '../ui/MenuBar';
import { Toolbar } from '../ui/Toolbar';
import { TabBar } from '../ui/TabBar';
import { StatusBar } from '../ui/StatusBar';
import { Overlays } from '../ui/Overlays';
import { OutlinePanel } from '../ui/OutlinePanel';
import { LazyEditor } from '../editor/LazyEditor';
import { useApp } from '../state/AppProvider';

export function FullPage() {
  const app = useApp();
  return (
    <div className="relative flex h-full w-full flex-col bg-neutral-50 text-neutral-900 dark:bg-[#1e1e1e] dark:text-neutral-100">
      <MenuBar />
      <Toolbar />
      <TabBar />
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <LazyEditor allowSplit />
        </div>
        {app.view.outline && <OutlinePanel />}
      </div>
      <StatusBar />
      <Overlays />
    </div>
  );
}
