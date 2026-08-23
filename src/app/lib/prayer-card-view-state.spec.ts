import { describe, expect, it } from 'vitest';
import { computePrayerCardViewState } from './prayer-card-view-state';
import type { PrayerRequest } from '../services/prayer.service';

const basePrayer: PrayerRequest = {
  id: 'p1',
  title: 'John 3:16',
  prayer_for: 'Verse Memorization',
  description: 'For God so loved the world...',
  requester: 'Church',
  email: 'admin@example.com',
  status: 'current',
  approval_status: 'approved',
  content_kind: 'verse_memorization',
  verse_reference: 'John 3:16',
  verse_translation: 'esv',
};

const baseInput = {
  variant: 'home' as const,
  prayer: basePrayer,
  isAdmin: false,
  isPersonal: false,
  activeFilter: 'current' as const,
  deletionsAllowed: true,
  updatesAllowed: true,
  reminderSessionEmail: '',
  currentUserEmail: 'user@example.com',
};

describe('computePrayerCardViewState', () => {
  it('shows Memorize button and hides Add Update for verse memorization prayers', () => {
    const state = computePrayerCardViewState(baseInput);
    expect(state.showMemorizeButton).toBe(true);
    expect(state.showAddUpdateButton).toBe(false);
  });

  it('does not show Memorize for standard community prayers', () => {
    const prayer = { ...basePrayer, content_kind: 'standard' as const };
    const state = computePrayerCardViewState({ ...baseInput, prayer });
    expect(state.showMemorizeButton).toBe(false);
    expect(state.showAddUpdateButton).toBe(true);
  });
});
