import { Toast } from './Toast';
import { OneDrivePicker } from '../onedrive/OneDrivePicker';

/** Overlays live inside each layout root (position: relative) so that in widget
 * mode they stay clipped within the card. */
export function Overlays() {
  return (
    <>
      <OneDrivePicker />
      <Toast />
    </>
  );
}
