import { WidgetCard } from './WidgetCard';
import { Toolbar } from '../../ui/Toolbar';
import { TabBar } from '../../ui/TabBar';
import { StatusBar } from '../../ui/StatusBar';
import { Overlays } from '../../ui/Overlays';
import { DocSidebar } from '../../ui/DocSidebar';
import { LazyEditor } from '../../editor/LazyEditor';

/** 720×510 — desktop-style with a sidebar beside the editor. */
export function Expanded() {
  return (
    <WidgetCard>
      <div className="flex min-h-0 flex-1">
        <DocSidebar width="w-44" />
        <div className="flex min-w-0 flex-1 flex-col">
          <Toolbar compact />
          <TabBar compact />
          <div className="min-h-0 flex-1">
            <LazyEditor allowSplit={false} />
          </div>
          <StatusBar compact />
        </div>
      </div>
      <Overlays />
    </WidgetCard>
  );
}
