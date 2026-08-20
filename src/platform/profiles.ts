// Container-dimension → hosting-context classification. Pure + unit-tested.

export type WidgetProfile = 'landscape' | 'portrait' | 'expanded' | 'xl';

export type Platform =
  | { kind: 'widget'; profile: WidgetProfile; width: number; height: number }
  | { kind: 'sidepanel'; width: number; height: number }
  | { kind: 'fullpage'; width: number; height: number };

export type PlatformKind = Platform['kind'];

export const WIDGET_SIZES: Record<WidgetProfile, { w: number; h: number }> = {
  landscape: { w: 344, h: 165 },
  portrait: { w: 388, h: 510 },
  expanded: { w: 720, h: 510 },
  xl: { w: 1100, h: 510 },
};

// A widget is short; the tallest widget profile is 510px. Anything meaningfully
// taller is a full page or the (tall, narrow) Chrome side panel.
const WIDGET_MAX_HEIGHT = 540;
const WIDGET_MAX_WIDTH = 1160;
const SIDEPANEL_MAX_WIDTH = 500;
const SIDEPANEL_MIN_HEIGHT = 620;

export function nearestWidgetProfile(
  width: number,
  height: number,
): WidgetProfile {
  let best: WidgetProfile = 'portrait';
  let bestDist = Infinity;
  (Object.keys(WIDGET_SIZES) as WidgetProfile[]).forEach((p) => {
    const { w, h } = WIDGET_SIZES[p];
    const dist = (w - width) ** 2 + (h - height) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = p;
    }
  });
  return best;
}

export function classify(width: number, height: number): Platform {
  if (height <= WIDGET_MAX_HEIGHT && width <= WIDGET_MAX_WIDTH) {
    return {
      kind: 'widget',
      profile: nearestWidgetProfile(width, height),
      width,
      height,
    };
  }
  if (width <= SIDEPANEL_MAX_WIDTH && height >= SIDEPANEL_MIN_HEIGHT) {
    return { kind: 'sidepanel', width, height };
  }
  return { kind: 'fullpage', width, height };
}
