import { WidgetCard } from './WidgetCard';
import { MenuBar } from '../../ui/MenuBar';
import { TabBar } from '../../ui/TabBar';
import { StatusBar } from '../../ui/StatusBar';
import { Overlays } from '../../ui/Overlays';
import { DocSidebar } from '../../ui/DocSidebar';
import { LazyEditor } from '../../editor/LazyEditor';

/** 1100×510 — full-width desktop: menu bar, sidebar, editor, minimap, split. */
export function ExtraLarge() {
  return (
    <WidgetCard>
      <MenuBar />
      <div className="flex min-h-0 flex-1">
        <DocSidebar width="w-52" />
        <div className="flex min-w-0 flex-1 flex-col">
          <TabBar />
          <div className="min-h-0 flex-1">
            <LazyEditor allowSplit />
          </div>
          <StatusBar />
        </div>
      </div>
      <Overlays />
    </WidgetCard>
  );
}
