import { describe, expect, it } from 'vitest';
import {
  appendVerseReferenceToDescription,
  verseMemorizationTextForDisplay,
  verseReferenceFromPrayer,
} from './verse-memorization-description';
import type { PrayerRequest } from '../services/prayer.service';

describe('verse-memorization-description', () => {
  it('appendVerseReferenceToDescription appends reference when missing', () => {
    expect(
      appendVerseReferenceToDescription(
        'You shall not add to the word.',
        'Deuteronomy 4:2'
      )
    ).toBe('You shall not add to the word. Deuteronomy 4:2');
  });

  it('appendVerseReferenceToDescription does not duplicate reference', () => {
    expect(
      appendVerseReferenceToDescription(
        'You shall not add. Deuteronomy 4:2',
        'Deuteronomy 4:2'
      )
    ).toBe('You shall not add. Deuteronomy 4:2');
  });

  it('verseMemorizationTextForDisplay strips markers and appends reference', () => {
    expect(
      verseMemorizationTextForDisplay(
        '[2] You shall not add to the word.',
        'Deuteronomy 4:2'
      )
    ).toBe('You shall not add to the word. Deuteronomy 4:2');
  });

  it('verseMemorizationTextForDisplay falls back to reference when description empty', () => {
    expect(verseMemorizationTextForDisplay('   ', 'Deuteronomy 4:2')).toBe(
      'Deuteronomy 4:2'
    );
  });

  it('verseReferenceFromPrayer prefers verse_reference over title', () => {
    const prayer = {
      title: 'Title fallback',
      verse_reference: ' John 3:16 ',
    } as PrayerRequest;
    expect(verseReferenceFromPrayer(prayer)).toBe('John 3:16');
  });

  it('verseReferenceFromPrayer falls back to title', () => {
    const prayer = {
      title: ' Psalm 23:1 ',
      verse_reference: null,
    } as PrayerRequest;
    expect(verseReferenceFromPrayer(prayer)).toBe('Psalm 23:1');
  });
});
