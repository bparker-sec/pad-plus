import { describe, it, expect } from 'vitest';
import { classify, nearestWidgetProfile, WIDGET_SIZES } from './profiles';

describe('classify', () => {
  it('maps each exact widget size to its profile', () => {
    for (const [profile, { w, h }] of Object.entries(WIDGET_SIZES)) {
      const p = classify(w, h);
      expect(p.kind).toBe('widget');
      if (p.kind === 'widget') expect(p.profile).toBe(profile);
    }
  });

  it('classifies the Chrome side panel (narrow + tall)', () => {
    expect(classify(360, 900).kind).toBe('sidepanel');
    expect(classify(400, 800).kind).toBe('sidepanel');
  });

  it('classifies a desktop viewport as full page', () => {
    expect(classify(1280, 800).kind).toBe('fullpage');
    expect(classify(1920, 1080).kind).toBe('fullpage');
  });

  it('treats a very short, wide strip as a widget (landscape)', () => {
    const p = classify(344, 165);
    expect(p.kind).toBe('widget');
    if (p.kind === 'widget') expect(p.profile).toBe('landscape');
  });
});

describe('nearestWidgetProfile', () => {
  it('picks the closest profile for in-between sizes', () => {
    expect(nearestWidgetProfile(500, 510)).toBe('portrait');
    expect(nearestWidgetProfile(800, 510)).toBe('expanded');
    expect(nearestWidgetProfile(1050, 500)).toBe('xl');
    expect(nearestWidgetProfile(350, 170)).toBe('landscape');
  });
});
