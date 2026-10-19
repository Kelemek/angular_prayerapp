import { describe, it, expect } from 'vitest';
import {
  showPrayerCardPrayedForBadge,
  showPrayerCardRequesterName,
  showPrayerCardUpdateAuthor,
} from './prayer-card-display';

describe('showPrayerCardRequesterName', () => {
  it('shows the requester on church and group cards', () => {
    expect(
      showPrayerCardRequesterName({
        isPersonal: false,
        isMember: false,
        isGroupPrayer: false,
      })
    ).toBe(true);
    expect(
      showPrayerCardRequesterName({
        isPersonal: true,
        isMember: false,
        isGroupPrayer: true,
      })
    ).toBe(true);
  });

  it('hides the requester on personal cards', () => {
    expect(
      showPrayerCardRequesterName({
        isPersonal: true,
        isMember: false,
        isGroupPrayer: false,
      })
    ).toBe(false);
  });
});

describe('showPrayerCardUpdateAuthor', () => {
  it('shows the update author on church and group cards', () => {
    expect(
      showPrayerCardUpdateAuthor({ isCommunityPrayer: true, isGroupPrayer: false })
    ).toBe(true);
    expect(
      showPrayerCardUpdateAuthor({ isCommunityPrayer: false, isGroupPrayer: true })
    ).toBe(true);
  });

  it('hides the update author on personal cards', () => {
    expect(
      showPrayerCardUpdateAuthor({ isCommunityPrayer: false, isGroupPrayer: false })
    ).toBe(false);
  });
});

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
