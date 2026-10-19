import { describe, expect, it, vi } from 'vitest';
import { runPrayerCardPrayFor } from './prayer-card-pray-for-run';

describe('runPrayerCardPrayFor', () => {
  it('increments group prayers with the group RPC, not personal', async () => {
    const incrementGroupPrayerPrayedFor = vi.fn().mockResolvedValue(2);
    const incrementPersonalPrayedFor = vi.fn();
    const encouragement = {
      canPrayFor: vi.fn().mockReturnValue(true),
      recordPrayedFor: vi.fn(),
      clearPrayedForCooldown: vi.fn(),
    };

    const count = await runPrayerCardPrayFor(
      {
        prayerService: {
          incrementMemberPrayedFor: vi.fn(),
          incrementPersonalPrayedFor,
          incrementGroupPrayerPrayedFor,
          incrementPrayedFor: vi.fn(),
        } as never,
        prayerEncouragementService: encouragement as never,
      },
      {
        prayerId: 'group-prayer-1',
        isMember: false,
        isPersonal: false,
        isGroupPrayer: true,
        usePersonalCooldown: true,
      },
    );

    expect(count).toBe(2);
    expect(incrementGroupPrayerPrayedFor).toHaveBeenCalledWith('group-prayer-1');
    expect(incrementPersonalPrayedFor).not.toHaveBeenCalled();
    expect(encouragement.recordPrayedFor).toHaveBeenCalledWith(
      'group-prayer-1',
      true,
    );
  });
});
