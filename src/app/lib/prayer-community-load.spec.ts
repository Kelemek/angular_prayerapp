import { describe, it, expect } from 'vitest';
import { formatApprovedCommunityPrayersFromDb } from './prayer-community-load';

describe('formatApprovedCommunityPrayersFromDb', () => {
  it('keeps requester email and approved update author_email for own-content badge exclusion', () => {
    const [prayer] = formatApprovedCommunityPrayersFromDb([
      {
        id: 'p1',
        title: 'Title',
        description: 'Desc',
        status: 'current',
        requester: 'Me',
        prayer_for: 'Someone',
        email: 'me@example.com',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        prayer_updates: [
          {
            id: 'u1',
            prayer_id: 'p1',
            content: 'Update',
            author: 'Me',
            author_email: 'me@example.com',
            approval_status: 'approved',
            created_at: '2026-01-02T00:00:00Z',
          },
          {
            id: 'u2',
            prayer_id: 'p1',
            content: 'Pending',
            author: 'Other',
            author_email: 'other@example.com',
            approval_status: 'pending',
            created_at: '2026-01-03T00:00:00Z',
          },
        ],
      },
    ]);

    expect(prayer.email).toBe('me@example.com');
    expect(prayer.updates).toHaveLength(1);
    expect(prayer.updates[0].author_email).toBe('me@example.com');
  });
});
