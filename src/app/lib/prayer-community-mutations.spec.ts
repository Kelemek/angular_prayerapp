import { describe, expect, it, vi } from 'vitest';
import {
  buildCommunityPrayerInsertRow,
  buildCommunityPrayerStatusUpdatePayload,
  dispatchCommunityPendingUpdateAdminNotification,
  ensureEmailSubscriberForPrayerSubmit,
  patchCommunityPrayerStatus,
  removeCommunityPrayerById,
  removeCommunityPrayerFromBothLists,
  shouldDropCommunityReminderForStatus,
} from './prayer-community-mutations';

describe('prayer-community-mutations', () => {
  it('builds pending community prayer insert row', () => {
    expect(
      buildCommunityPrayerInsertRow({
        title: 'Pray',
        description: 'Desc',
        status: 'current',
        requester: 'Jane',
        prayer_for: 'John',
        email: 'j@example.com',
        is_anonymous: false,
      })
    ).toMatchObject({
      approval_status: 'pending',
      email: 'j@example.com',
    });
  });

  it('patches status and answered date', () => {
    const updated = patchCommunityPrayerStatus(
      [{ id: 'p1', status: 'current' } as never],
      'p1',
      'answered'
    );
    expect(updated[0].status).toBe('answered');
    expect(updated[0].date_answered).toBeTruthy();
  });

  it('removes prayer by id', () => {
    expect(
      removeCommunityPrayerById(
        [{ id: 'p1' } as never, { id: 'p2' } as never],
        'p1'
      )
    ).toHaveLength(1);
  });

  it('drops reminders for archived or answered', () => {
    expect(shouldDropCommunityReminderForStatus('answered')).toBe(true);
    expect(shouldDropCommunityReminderForStatus('current')).toBe(false);
  });

  it('builds status update payload with answered date', () => {
    const payload = buildCommunityPrayerStatusUpdatePayload('answered');
    expect(payload.status).toBe('answered');
    expect(payload.date_answered).toBeTruthy();
    expect(buildCommunityPrayerStatusUpdatePayload('current').date_answered).toBeNull();
  });

  it('removes prayer from filtered and all lists', () => {
    const lists = removeCommunityPrayerFromBothLists(
      [{ id: 'p1' } as never, { id: 'p2' } as never],
      [{ id: 'p1' } as never, { id: 'p2' } as never, { id: 'p3' } as never],
      'p1'
    );
    expect(lists.filtered).toHaveLength(1);
    expect(lists.all).toHaveLength(2);
  });

  it('ensureEmailSubscriberForPrayerSubmit inserts when missing', async () => {
    const insertSubscriber = vi.fn().mockResolvedValue(undefined);
    const findExistingSubscriber = vi.fn().mockResolvedValue(null);

    await ensureEmailSubscriberForPrayerSubmit(
      'Jane',
      'Jane@Example.com',
      findExistingSubscriber,
      insertSubscriber
    );

    expect(findExistingSubscriber).toHaveBeenCalledWith('jane@example.com');
    expect(insertSubscriber).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'jane@example.com', name: 'Jane' })
    );
  });

  it('dispatchCommunityPendingUpdateAdminNotification skips when title missing', () => {
    const onNotify = vi.fn();
    dispatchCommunityPendingUpdateAdminNotification(
      undefined,
      'author',
      'content',
      'id-1',
      onNotify
    );
    expect(onNotify).not.toHaveBeenCalled();
  });
});
