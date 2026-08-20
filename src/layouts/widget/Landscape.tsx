import { WidgetCard } from './WidgetCard';
import { Toolbar } from '../../ui/Toolbar';
import { TabBar } from '../../ui/TabBar';
import { Overlays } from '../../ui/Overlays';
import { LazyEditor } from '../../editor/LazyEditor';

/** 344×165 — high-density horizontal flow, tabs, minimal chrome. */
export function Landscape() {
  return (
    <WidgetCard>
      <Toolbar compact allowSplit={false} />
      <TabBar compact />
      <div className="min-h-0 flex-1">
        <LazyEditor allowSplit={false} forceMinimapOff compact />
      </div>
      <Overlays />
    </WidgetCard>
  );
}
