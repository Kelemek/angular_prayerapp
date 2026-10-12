import { describe, it, expect } from 'vitest';
import { showPrayerCardPrayedForBadge } from './prayer-card-display';

describe('showPrayerCardPrayedForBadge', () => {
  it('shows the prayed-for badge for admins on community prayers with a count', () => {
    expect(
      showPrayerCardPrayedForBadge(
        3,
        false,
        false,
        true,
        'admin@example.com',
        'member@example.com'
      )
    ).toBe(true);
  });

  it('hides the badge for non-admins on another user community prayer', () => {
    expect(
      showPrayerCardPrayedForBadge(
        3,
        false,
        false,
        false,
        'user@example.com',
        'member@example.com'
      )
    ).toBe(false);
  });
});
