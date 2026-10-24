import { describe, expect, it } from 'vitest';
import {
  buildHourlyPrayerSpotlightCandidates,
  pickHourlyPrayerSpotlightCandidate,
} from './hourly-prayer-reminder-spotlight';

describe('buildHourlyPrayerSpotlightCandidates', () => {
  const community = [
    {
      id: 'church-1',
      title: 'Church',
      description: 'd',
      prayer_for: 'Bob',
      requester: 'Alice',
      is_anonymous: false,
    },
  ];
  const personal = [
    {
      id: 'pers-1',
      title: 'Mine',
      description: 'pd',
      prayer_for: 'Me',
      category: 'Health',
    },
    {
      id: 'pers-answered',
      title: 'Done',
      description: '',
      prayer_for: 'X',
      category: 'Answered',
    },
  ];
  const group = [
    {
      id: 'grp-1',
      title: 'Group ask',
      description: 'gd',
      prayer_for: 'Team',
      requester: 'Sam',
      is_anonymous: true,
    },
  ];

  it('includes community, personal, and group rows when community is enabled', () => {
    const pool = buildHourlyPrayerSpotlightCandidates({
      includeCommunity: true,
      communityRows: community,
      personalRows: personal,
      groupRows: group,
    });
    expect(pool.map((c) => c.key).sort()).toEqual(['c:church-1', 'g:grp-1', 'p:pers-1']);
    expect(pool.find((c) => c.key === 'g:grp-1')?.requester).toBe('Anonymous');
    expect(pool.find((c) => c.key === 'p:pers-1')?.requester).toBe('Me');
  });

  it('omits community prayers for group-only recipients', () => {
    const pool = buildHourlyPrayerSpotlightCandidates({
      includeCommunity: false,
      communityRows: community,
      personalRows: personal,
      groupRows: group,
    });
    expect(pool.some((c) => c.key.startsWith('c:'))).toBe(false);
    expect(pool.map((c) => c.key).sort()).toEqual(['g:grp-1', 'p:pers-1']);
  });

  it('skips answered personal prayers', () => {
    const pool = buildHourlyPrayerSpotlightCandidates({
      includeCommunity: false,
      communityRows: [],
      personalRows: personal,
      groupRows: [],
    });
    expect(pool).toHaveLength(1);
    expect(pool[0].key).toBe('p:pers-1');
  });
});

describe('pickHourlyPrayerSpotlightCandidate', () => {
  it('returns null for an empty pool', () => {
    expect(pickHourlyPrayerSpotlightCandidate([], null)).toBeNull();
  });
});
