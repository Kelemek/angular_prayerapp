import { describe, expect, it } from 'vitest';
import {
  groupPrayerCatalogCacheMatchesViewer,
  groupPrayerUpdatesByPrayerId,
  shouldShowGroupCatalogLoadingIndicator,
} from './prayer-group-catalog-load';

describe('shouldShowGroupCatalogLoadingIndicator', () => {
  it('shows loading on first load without cache', () => {
    expect(shouldShowGroupCatalogLoadingIndicator(false, null)).toBe(true);
    expect(shouldShowGroupCatalogLoadingIndicator(false, undefined)).toBe(true);
  });

  it('hides loading when cache exists', () => {
    expect(
      shouldShowGroupCatalogLoadingIndicator(false, {
        viewerEmail: 'user@example.com',
        groups: [],
        prayers: [],
        updates: [],
      }),
    ).toBe(false);
  });

  it('does not show loading on silent refresh', () => {
    expect(shouldShowGroupCatalogLoadingIndicator(true, null)).toBe(false);
  });
});

describe('groupPrayerCatalogCacheMatchesViewer', () => {
  it('matches the signed-in email case-insensitively', () => {
    expect(
      groupPrayerCatalogCacheMatchesViewer(
        {
          viewerEmail: 'User@Example.com',
          groups: [],
          prayers: [],
          updates: [],
        },
        'user@example.com',
      ),
    ).toBe(true);
  });

  it('rejects another account cache', () => {
    expect(
      groupPrayerCatalogCacheMatchesViewer(
        {
          viewerEmail: 'a@example.com',
          groups: [],
          prayers: [],
          updates: [],
        },
        'b@example.com',
      ),
    ).toBe(false);
  });
});

describe('groupPrayerUpdatesByPrayerId', () => {
  it('groups updates by prayer id', () => {
    const map = groupPrayerUpdatesByPrayerId([
      {
        id: 'u1',
        group_prayer_id: 'p1',
        content: 'a',
        author: 'A',
        author_email: 'a@example.com',
        mark_as_answered: false,
        created_at: '',
        updated_at: '',
      },
      {
        id: 'u2',
        group_prayer_id: 'p1',
        content: 'b',
        author: 'B',
        author_email: 'b@example.com',
        mark_as_answered: false,
        created_at: '',
        updated_at: '',
      },
    ]);
    expect(map.get('p1')?.length).toBe(2);
  });
});
