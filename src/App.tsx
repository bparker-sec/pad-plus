import { AppProvider } from './state/AppProvider';
import { usePlatform } from './platform/usePlatform';
import { useShortcuts } from './state/useShortcuts';
import { FullPage } from './layouts/FullPage';
import { SidePanel } from './layouts/SidePanel';
import { Landscape } from './layouts/widget/Landscape';
import { Portrait } from './layouts/widget/Portrait';
import { Expanded } from './layouts/widget/Expanded';
import { ExtraLarge } from './layouts/widget/ExtraLarge';

function Root() {
  const platform = usePlatform();
  useShortcuts();

  if (platform.kind === 'fullpage') return <FullPage />;
  if (platform.kind === 'sidepanel') return <SidePanel />;

  switch (platform.profile) {
    case 'landscape':
      return <Landscape />;
    case 'portrait':
      return <Portrait />;
    case 'expanded':
      return <Expanded />;
    case 'xl':
      return <ExtraLarge />;
    default:
      return <Portrait />;
  }
}

export default function App() {
  return (
    <AppProvider>
      <Root />
    </AppProvider>
  );
}
