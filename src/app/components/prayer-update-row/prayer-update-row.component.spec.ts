import { describe, it, expect } from 'vitest';
import { PrayerUpdateRowComponent } from './prayer-update-row.component';
import {
  PRAYER_CARD_HEADER_BLEED_CLASSES,
  PRAYER_CARD_HEADER_INSET_CLASSES,
  PRESENTATION_CARD_HEADER_BLEED_CLASSES,
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
  });
});
