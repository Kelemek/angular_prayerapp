import { describe, expect, it } from 'vitest';
import {
  prayerDeletionAdminNotificationFromRow,
  updateDeletionAdminNotificationFromRow,
} from './prayer-community-deletion-requests';

describe('prayer-community-deletion-requests notify helpers', () => {
  it('prayerDeletionAdminNotificationFromRow builds deletion payload', () => {
    const payload = prayerDeletionAdminNotificationFromRow(
      { title: 'Heal John' },
      'duplicate',
      'Jane Doe',
      'req-1'
    );
    expect(payload).toEqual({
      type: 'deletion',
      title: 'Heal John',
      reason: 'duplicate',
      requester: 'Jane Doe',
      requestId: 'req-1',
    });
  });

  it('updateDeletionAdminNotificationFromRow includes update metadata', () => {
    const payload = updateDeletionAdminNotificationFromRow(
      {
        prayers: { title: 'Pray for Jane' },
        author: 'Bob',
        content: 'Update text',
      },
      'spam',
      'Jane Doe',
      'req-2'
    );
    expect(payload.type).toBe('deletion');
    expect(payload.title).toBe('Pray for Jane');
    expect(payload.author).toBe('Bob');
    expect(payload.content).toBe('Update text');
    expect(payload.requestId).toBe('req-2');
  });
});
