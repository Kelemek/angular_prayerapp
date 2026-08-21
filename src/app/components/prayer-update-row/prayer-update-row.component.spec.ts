import { describe, it, expect } from 'vitest';
import { PrayerUpdateRowComponent } from './prayer-update-row.component';
import {
  PRAYER_CARD_HEADER_BLEED_CLASSES,
  PRAYER_CARD_HEADER_INSET_CLASSES,
  PRESENTATION_CARD_HEADER_BLEED_CLASSES,
  PRAYER_UPDATE_ROW_SHELL_FILL_CLASSES,
  getUpdateRowHeaderBandRoundedClasses,
} from '../../lib/prayer-card-layout';

describe('PrayerUpdateRowComponent', () => {
  it('uses row shell bleed and full header inset on left and actions columns', () => {
    const component = new PrayerUpdateRowComponent();
    component.size = 'sm';

    expect(component.bandBleedClasses).toBe(PRAYER_CARD_HEADER_BLEED_CLASSES);
    expect(component.bandBleedClasses).not.toBe(
      PRESENTATION_CARD_HEADER_BLEED_CLASSES
    );
    expect(component.headerInsetClasses).toBe(PRAYER_CARD_HEADER_INSET_CLASSES);
    expect(PRAYER_UPDATE_ROW_SHELL_FILL_CLASSES).toContain('bg-shell-corner-seal');
  });

  it('derives header band radius from shellClass', () => {
    const component = new PrayerUpdateRowComponent();
    component.shellClass = 'rounded-xl';
    expect(component.headerBandRoundedClasses).toBe(
      getUpdateRowHeaderBandRoundedClasses('rounded-xl')
    );

    component.shellClass = 'rounded-lg';
    expect(component.headerBandRoundedClasses).toBe(
      getUpdateRowHeaderBandRoundedClasses('rounded-lg')
    );
  });
});
