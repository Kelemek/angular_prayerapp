import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChangeDetectorRef } from '@angular/core';
import { HourReminderSettingsSectionComponent } from './hour-reminder-settings-section.component';
import { UserHourReminderService } from '../../services/user-hour-reminder.service';
import { UserSessionService } from '../../services/user-session.service';
import {
  deviceIanaTimezone,
  formatHourReminderSlotLabel,
} from '../../lib/hour-reminders/hour-reminder-format';

describe('HourReminderSettingsSectionComponent', () => {
  let component: HourReminderSettingsSectionComponent;
  let mockReminders: {
    ensureLoaded: ReturnType<typeof vi.fn>;
    addSlot: ReturnType<typeof vi.fn>;
    removeSlot: ReturnType<typeof vi.fn>;
    sessionCacheKeys: ReturnType<typeof vi.fn>;
  };
  let mockUserSession: { getCurrentSession: ReturnType<typeof vi.fn> };
  let mockCdr: { markForCheck: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockReminders = {
      ensureLoaded: vi.fn(() => Promise.resolve([])),
      addSlot: vi.fn(() =>
        Promise.resolve([
          { id: 'slot-1', local_hour: 8, local_minute: 0, iana_timezone: 'America/Chicago' },
        ])
      ),
      removeSlot: vi.fn(() => Promise.resolve([])),
      sessionCacheKeys: vi.fn(() => ({
        slotsKey: 'prayerHourReminders',
        fetchedAtKey: 'prayerHourRemindersFetchedAt',
      })),
    };
    mockUserSession = {
      getCurrentSession: vi.fn(() => ({ email: 'test@example.com' })),
    };
    mockCdr = { markForCheck: vi.fn() };

    component = new HourReminderSettingsSectionComponent(
      mockReminders as unknown as UserHourReminderService,
      mockUserSession as unknown as UserSessionService,
      mockCdr as unknown as ChangeDetectorRef
    );
    component.kind = 'prayer';
    component.title = 'Prayer reminders';
    component.description = 'desc';
    component.email = 'test@example.com';
    component.isOpen = true;
  });

  it('formatSlotLabel omits timezone when it matches device', () => {
    const label = component.formatSlotLabel({
      id: 's1',
      local_hour: 9,
      local_minute: 15,
      iana_timezone: deviceIanaTimezone(),
    });
    expect(label).not.toContain('·');
    expect(formatHourReminderSlotLabel).toBeDefined();
  });

  it('addSlot saves slot and shows success', async () => {
    component.selectedHour = 9;
    component.selectedMinute = 15;
    await component.addSlot();
    expect(component.slots).toHaveLength(1);
    expect(component.success).toContain('saved');
    expect(component.saving).toBe(false);
    expect(mockReminders.addSlot).toHaveBeenCalledWith(
      'prayer',
      'test@example.com',
      deviceIanaTimezone(),
      9,
      15
    );
  });

  it('addSlot handles duplicate time error', async () => {
    mockReminders.addSlot.mockRejectedValue({ code: '23505' });
    await component.addSlot();
    expect(component.error).toContain('already have a reminder');
  });

  it('reload ignores stale session cache for another email', async () => {
    mockReminders.sessionCacheKeys.mockReturnValue({
      slotsKey: 'memorizationHourReminders',
      fetchedAtKey: 'memorizationHourRemindersFetchedAt',
    });
    component.kind = 'memorization';
    const otherSlots = [
      { id: 'other', local_hour: 3, local_minute: 0, iana_timezone: 'UTC' },
    ];
    mockUserSession.getCurrentSession.mockReturnValue({
      email: 'other@example.com',
      memorizationHourReminders: otherSlots,
    });
    component.email = 'test@example.com';
    component.slots = otherSlots;
    component.reload();
    expect(component.slots).toEqual([]);
    expect(component.loading).toBe(true);
    await vi.waitFor(() => {
      expect(component.loading).toBe(false);
    });
  });

  it('reload ignores ensureLoaded result when session email changed', async () => {
    const slots = [{ id: 'cached', local_hour: 6, local_minute: 30, iana_timezone: 'UTC' }];
    mockUserSession.getCurrentSession.mockReturnValue({
      email: 'test@example.com',
      prayerHourReminders: undefined,
    });
    mockReminders.ensureLoaded.mockImplementation(async () => {
      mockUserSession.getCurrentSession.mockReturnValue({ email: 'other@example.com' });
      return slots;
    });
    component.reload();
    await vi.waitFor(() => {
      expect(component.loading).toBe(false);
    });
    expect(component.slots).toEqual([]);
  });
});
