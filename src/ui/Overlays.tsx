import { Toast } from './Toast';
import { Diagnostics } from './Diagnostics';
import { SessionsModal } from './SessionsModal';
import { FindInFiles } from './FindInFiles';
import { AboutModal } from './AboutModal';
import { HelpModal } from './HelpModal';
import { SetupHelpBanner } from './SetupHelpBanner';
import { OneDrivePicker } from '../onedrive/OneDrivePicker';

/** Overlays live inside each layout root (position: relative) so that in widget
 * mode they stay clipped within the card. */
export function Overlays() {
  return (
    <>
      <OneDrivePicker />
      <Diagnostics />
      <SessionsModal />
      <FindInFiles />
      <AboutModal />
      <HelpModal />
      <SetupHelpBanner />
      <Toast />
    </>
  );
}
