import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  buildAdminCreatedEmailSubscriberInsertRow,
  ensureAdminCreatedEmailSubscriber,
  emptyAdminCreatedSubscriberPcMeta,
  resolvePlanningCenterMetaForAdminCreatedSubscriber,
} from './admin-created-email-subscriber';
import * as prayerCommunityDb from './prayer-community-db';

describe('admin-created-email-subscriber', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('builds insert row matching admin-created defaults', () => {
    expect(
      buildAdminCreatedEmailSubscriberInsertRow('Jane Doe', 'jane@example.com', {
        inPlanningCenter: true,
        planningCenterCheckedAt: '2026-01-01T00:00:00.000Z',
      }),
    ).toEqual({
      name: 'Jane Doe',
      email: 'jane@example.com',
      is_active: true,
      is_admin: false,
      receive_admin_emails: false,
      in_planning_center: true,
      planning_center_checked_at: '2026-01-01T00:00:00.000Z',
    });
  });

  it('ensureAdminCreatedEmailSubscriber inserts when missing', async () => {
    vi.spyOn(prayerCommunityDb, 'findEmailSubscriberByEmail').mockResolvedValue({
      data: null,
      error: null,
    });
    const insertRow = vi.spyOn(prayerCommunityDb, 'insertEmailSubscriberRow').mockResolvedValue({
      error: null,
    });

    const result = await ensureAdminCreatedEmailSubscriber(
      { from: vi.fn() } as never,
      'Jane Doe',
      'Jane@Example.com',
      vi.fn().mockResolvedValue(emptyAdminCreatedSubscriberPcMeta()),
    );

    expect(result).toEqual({ status: 'created', normalizedEmail: 'jane@example.com' });
    expect(insertRow).toHaveBeenCalled();
  });

  it('ensureAdminCreatedEmailSubscriber returns exists when subscriber is present', async () => {
    vi.spyOn(prayerCommunityDb, 'findEmailSubscriberByEmail').mockResolvedValue({
      data: { id: 'sub-1' },
      error: null,
    });
    const insertRow = vi.spyOn(prayerCommunityDb, 'insertEmailSubscriberRow');

    const result = await ensureAdminCreatedEmailSubscriber(
      { from: vi.fn() } as never,
      'Jane Doe',
      'jane@example.com',
      vi.fn(),
    );

    expect(result).toEqual({ status: 'exists', normalizedEmail: 'jane@example.com' });
    expect(insertRow).not.toHaveBeenCalled();
  });

  it('ensureAdminCreatedEmailSubscriber treats unique violation as exists', async () => {
    vi.spyOn(prayerCommunityDb, 'findEmailSubscriberByEmail').mockResolvedValue({
      data: null,
      error: null,
    });
    vi.spyOn(prayerCommunityDb, 'insertEmailSubscriberRow').mockResolvedValue({
      error: { code: '23505' },
    });

    const result = await ensureAdminCreatedEmailSubscriber(
      { from: vi.fn() } as never,
      'Jane Doe',
      'jane@example.com',
      vi.fn().mockResolvedValue(emptyAdminCreatedSubscriberPcMeta()),
    );

    expect(result).toEqual({ status: 'exists', normalizedEmail: 'jane@example.com' });
  });

  it('ensureAdminCreatedEmailSubscriber returns invalid for bad email', async () => {
    const result = await ensureAdminCreatedEmailSubscriber(
      { from: vi.fn() } as never,
      'Jane Doe',
      'not-an-email',
      vi.fn(),
    );

    expect(result).toEqual({
      status: 'invalid',
      error: 'Please enter a valid email address',
    });
  });

  it('ensureAdminCreatedEmailSubscriber throws when lookup fails', async () => {
    vi.spyOn(prayerCommunityDb, 'findEmailSubscriberByEmail').mockResolvedValue({
      data: null,
      error: new Error('lookup failed'),
    });

    await expect(
      ensureAdminCreatedEmailSubscriber(
        { from: vi.fn() } as never,
        'Jane Doe',
        'jane@example.com',
        vi.fn(),
      ),
    ).rejects.toThrow('lookup failed');
  });

  it('resolvePlanningCenterMetaForAdminCreatedSubscriber returns empty meta on lookup failure', async () => {
    const lookup = vi.fn().mockRejectedValue(new Error('pc down'));
    const meta = await resolvePlanningCenterMetaForAdminCreatedSubscriber(
      lookup,
      'jane@example.com',
    );
    expect(meta).toEqual(emptyAdminCreatedSubscriberPcMeta());
  });

  it('resolvePlanningCenterMetaForAdminCreatedSubscriber sets PC fields on success', async () => {
    const lookup = vi.fn().mockResolvedValue({ count: 2 });
    const meta = await resolvePlanningCenterMetaForAdminCreatedSubscriber(
      lookup,
      'jane@example.com',
    );
    expect(meta.inPlanningCenter).toBe(true);
    expect(meta.planningCenterCheckedAt).toBeTruthy();
  });
});
