import { describe, expect, it, vi } from 'vitest';
import { ChangeDetectorRef, DestroyRef } from '@angular/core';
import { HomeGroupOwnerControlsComponent } from './home-group-owner-controls.component';
import { PrayerGroupService } from '../../services/prayer-group.service';

describe('HomeGroupOwnerControlsComponent', () => {
  it('does not add an owner when the viewer is a member', async () => {
    const setMemberRole = vi.fn();
    const invite = vi.fn();
    const panel = new HomeGroupOwnerControlsComponent(
      { setMemberRole, invite } as unknown as PrayerGroupService,
      { error: vi.fn(), info: vi.fn(), success: vi.fn() } as never,
      { markForCheck: vi.fn() } as unknown as ChangeDetectorRef,
      { onDestroy: vi.fn() } as unknown as DestroyRef,
    );
    panel.group = {
      id: 'g1',
      name: 'Family',
      color: '#2563EB',
      role: 'member',
      memberCount: 2,
      updatesRequesterOnly: false,
      answeredRequesterOnly: false,
      prayForDisabled: false,
    };
    panel.ownerPick = ['pat@example.com'];
    await panel.promoteSelected();
    expect(setMemberRole).not.toHaveBeenCalled();
    expect(invite).not.toHaveBeenCalled();
  });

  it('shows the database message when Make owner returns a plain PostgREST error', async () => {
    const setMemberRole = vi
      .fn()
      .mockRejectedValue({ message: 'permission denied for function is_prayer_group_member_row' });
    const error = vi.fn();
    const panel = new HomeGroupOwnerControlsComponent(
      { setMemberRole } as unknown as PrayerGroupService,
      { error, info: vi.fn(), success: vi.fn() } as never,
      { markForCheck: vi.fn() } as unknown as ChangeDetectorRef,
      { onDestroy: vi.fn() } as unknown as DestroyRef,
    );
    panel.group = {
      id: 'g1',
      name: 'test',
      color: '#2563EB',
      role: 'owner',
      memberCount: 3,
      updatesRequesterOnly: false,
      answeredRequesterOnly: false,
      prayForDisabled: false,
    };
    panel.ownerPick = ['gmail@example.com'];
    await panel.promoteSelected();
    expect(error).toHaveBeenCalledWith('permission denied for function is_prayer_group_member_row');
  });
});
