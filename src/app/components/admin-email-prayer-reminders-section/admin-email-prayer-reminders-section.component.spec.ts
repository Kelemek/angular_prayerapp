import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChangeDetectorRef } from '@angular/core';
import { AdminEmailPrayerRemindersSectionComponent } from './admin-email-prayer-reminders-section.component';

describe('AdminEmailPrayerRemindersSectionComponent', () => {
  let component: AdminEmailPrayerRemindersSectionComponent;
  let mockSupabaseService: { client: { from: ReturnType<typeof vi.fn> } };
  let mockToastService: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let mockChangeDetectorRef: { markForCheck: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabaseService = {
      client: {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
          upsert: vi.fn(() => ({
            select: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      },
    };

    mockToastService = {
      success: vi.fn(),
      error: vi.fn(),
    };

    mockChangeDetectorRef = {
      markForCheck: vi.fn(),
    };

    component = new AdminEmailPrayerRemindersSectionComponent(
      mockSupabaseService as never,
      mockToastService as never,
      mockChangeDetectorRef as unknown as ChangeDetectorRef,
    );
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('default property values', () => {
    it('uses default reminder settings', () => {
      expect(component.settings.enableReminders).toBe(false);
      expect(component.settings.reminderIntervalDays).toBe(7);
      expect(component.settings.enableAutoArchive).toBe(false);
      expect(component.settings.daysBeforeArchive).toBe(7);
    });

    it('should have loading default to false until section opens', () => {
      expect(component.loading).toBe(false);
    });

    it('should have saving default to false', () => {
      expect(component.saving).toBe(false);
    });
  });

  describe('onSectionToggle', () => {
    it('calls loadSettings on first expand only', () => {
      const loadSettingsSpy = vi.spyOn(component, 'loadSettings');
      component.onSectionToggle();
      expect(component.sectionExpanded).toBe(true);
      expect(loadSettingsSpy).toHaveBeenCalledTimes(1);
      component.onSectionToggle();
      component.onSectionToggle();
      expect(loadSettingsSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('loadSettings', () => {
    it('should set loading to true initially', async () => {
      component.loading = false;
      const promise = component.loadSettings();
      expect(component.loading).toBe(true);
      await promise;
    });

    it('should load settings successfully', async () => {
      const mockData = {
        enable_reminders: true,
        reminder_interval_days: 14,
        enable_auto_archive: true,
        days_before_archive: 10,
      };
      mockSupabaseService.client.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: mockData, error: null })),
          })),
        })),
      }));

      await component.loadSettings();

      expect(component.settings.enableReminders).toBe(true);
      expect(component.settings.reminderIntervalDays).toBe(14);
      expect(component.settings.enableAutoArchive).toBe(true);
      expect(component.settings.daysBeforeArchive).toBe(10);
      expect(component.loading).toBe(false);
      expect(mockChangeDetectorRef.markForCheck).toHaveBeenCalled();
    });

    it('should handle error when loading settings fails', async () => {
      const emitSpy = vi.spyOn(component.settingsError, 'emit');
      const mockError = { message: 'Database error' };
      mockSupabaseService.client.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: mockError })),
          })),
        })),
      }));

      await component.loadSettings();

      expect(emitSpy).toHaveBeenCalledWith(
        'Failed to load email settings: Database error',
      );
      expect(component.loading).toBe(false);
    });
  });

  describe('saveReminderSettings', () => {
    it('should save reminder settings successfully', async () => {
      mockSupabaseService.client.from = vi.fn(() => ({
        upsert: vi.fn(() => ({
          select: vi.fn(() => Promise.resolve({ data: {}, error: null })),
        })),
      }));

      component.settings = {
        enableReminders: true,
        reminderIntervalDays: 10,
        enableAutoArchive: true,
        daysBeforeArchive: 5,
      };

      const emitSpy = vi.spyOn(component.saved, 'emit');

      await component.saveReminderSettings();

      expect(component.success).toBe(true);
      expect(component.saving).toBe(false);
      expect(mockToastService.success).toHaveBeenCalledWith(
        'Prayer reminder settings saved!',
      );
      expect(emitSpy).toHaveBeenCalled();
    });

    it('should handle error when saving fails', async () => {
      const emitSpy = vi.spyOn(component.settingsError, 'emit');
      const mockError = { message: 'Update failed' };
      mockSupabaseService.client.from = vi.fn(() => ({
        upsert: vi.fn(() => ({
          select: vi.fn(() => Promise.resolve({ data: null, error: mockError })),
        })),
      }));

      await component.saveReminderSettings();

      expect(emitSpy).toHaveBeenCalledWith(
        'Failed to save reminder settings: Update failed',
      );
      expect(component.success).toBe(false);
      expect(component.saving).toBe(false);
      expect(mockToastService.error).toHaveBeenCalledWith(
        'Failed to save reminder settings',
      );
    });
  });

  describe('validateReminderDays', () => {
    it('clamps reminder interval days', () => {
      component.settings = { ...component.settings, reminderIntervalDays: 0 };
      component.validateReminderDays();
      expect(component.settings.reminderIntervalDays).toBe(1);
    });
  });

  describe('validateArchiveDays', () => {
    it('clamps archive days', () => {
      component.settings = { ...component.settings, daysBeforeArchive: 100 };
      component.validateArchiveDays();
      expect(component.settings.daysBeforeArchive).toBe(90);
    });
  });
});
