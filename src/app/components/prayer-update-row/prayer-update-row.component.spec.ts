import { describe, it, expect } from 'vitest';
import { PrayerUpdateRowComponent } from './prayer-update-row.component';
import {
  PRAYER_CARD_HEADER_BLEED_CLASSES,
  PRESENTATION_CARD_HEADER_BLEED_CLASSES,
} from '../../lib/prayer-card-layout';

describe('PrayerUpdateRowComponent', () => {
  it('uses row shell bleed and compact inset like home when compactHeaderInset is set', () => {
    const component = new PrayerUpdateRowComponent();
    component.size = 'sm';
    component.compactHeaderInset = true;

    expect(component.bandBleedClasses).toBe(PRAYER_CARD_HEADER_BLEED_CLASSES);
    expect(component.bandBleedClasses).not.toBe(
      PRESENTATION_CARD_HEADER_BLEED_CLASSES
    );
    expect(component.compactHeaderInset).toBe(true);
  });
});
