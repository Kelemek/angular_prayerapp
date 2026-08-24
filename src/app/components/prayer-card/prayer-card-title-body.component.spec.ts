import { describe, expect, it } from 'vitest';
import { PrayerCardTitleBodyComponent } from './prayer-card-title-body.component';
import type { PrayerRequest } from '../../services/prayer.service';

describe('PrayerCardTitleBodyComponent', () => {
  const basePrayer: PrayerRequest = {
    id: 'p1',
    title: 'Deuteronomy 4:2',
    prayer_for: 'Verse Memorization',
    description: '[2] You shall not add to the word that I command you.',
    requester: 'Church',
    email: 'admin@example.com',
    status: 'current',
    approval_status: 'approved',
    content_kind: 'verse_memorization',
    verse_reference: 'Deuteronomy 4:2',
    verse_translation: 'esv',
  };

  it('verseTextForDisplay strips markers and appends reference', () => {
    const component = new PrayerCardTitleBodyComponent();
    component.prayer = basePrayer;
    expect(component.verseTextForDisplay()).toBe(
      'You shall not add to the word that I command you. Deuteronomy 4:2'
    );
  });

  it('verseTextForDisplay falls back to reference when description is empty', () => {
    const component = new PrayerCardTitleBodyComponent();
    component.prayer = { ...basePrayer, description: '   ' };
    expect(component.verseTextForDisplay()).toBe('Deuteronomy 4:2');
  });

  it('verseTextForDisplay does not duplicate reference when already at end', () => {
    const component = new PrayerCardTitleBodyComponent();
    component.prayer = {
      ...basePrayer,
      description: 'You shall not add. Deuteronomy 4:2',
    };
    expect(component.verseTextForDisplay()).toBe(
      'You shall not add. Deuteronomy 4:2'
    );
  });
});
