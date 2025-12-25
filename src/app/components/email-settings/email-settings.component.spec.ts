import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChangeDetectorRef } from '@angular/core';
import { EmailSettingsComponent } from './email-settings.component';

describe('EmailSettingsComponent', () => {
  let component: EmailSettingsComponent;
  let mockSupabaseService: any;
  let mockToastService: any;
  let mockChangeDetectorRef: any;

  beforeEach(() => {
    mockSupabaseService = {
      client: {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
            }))
          })),
          upsert: vi.fn(() => ({
            select: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      }
    };

    mockToastService = {
      success: vi.fn(),
      error: vi.fn()
    };

    mockChangeDetectorRef = {
      detectChanges: vi.fn(),
      markForCheck: vi.fn()
    };

    component = new EmailSettingsComponent(
      mockSupabaseService,
      mockToastService,
      mockChangeDetectorRef as ChangeDetectorRef
    );
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('default property values', () => {
    it('should have enableReminders default to false', () => {
      expect(component.enableReminders).toBe(false);
    });

    it('should have reminderIntervalDays default to 7', () => {
      expect(component.reminderIntervalDays).toBe(7);
    });

    it('should have enableAutoArchive default to false', () => {
      expect(component.enableAutoArchive).toBe(false);
    });

    it('should have daysBeforeArchive default to 7', () => {
      expect(component.daysBeforeArchive).toBe(7);
    });

    it('should have loading default to true', () => {
      expect(component.loading).toBe(true);
    });

    it('should have savingReminders default to false', () => {
      expect(component.savingReminders).toBe(false);
    });

    it('should have error default to null', () => {
      expect(component.error).toBe(null);
    });

    it('should have successVerification default to false', () => {
      expect(component.successVerification).toBe(false);
    });

    it('should have successReminders default to false', () => {
      expect(component.successReminders).toBe(false);
    });
  });

  describe('ngOnInit', () => {
    it('should call loadSettings on initialization', () => {
      const loadSettingsSpy = vi.spyOn(component, 'loadSettings');
      component.ngOnInit();
      expect(loadSettingsSpy).toHaveBeenCalled();
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
        days_before_archive: 10
      };
      mockSupabaseService.client.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: mockData, error: null }))
          }))
        }))
      }));

      await component.loadSettings();

      expect(component.enableReminders).toBe(true);
      expect(component.reminderIntervalDays).toBe(14);
      expect(component.enableAutoArchive).toBe(true);
      expect(component.daysBeforeArchive).toBe(10);
      expect(component.loading).toBe(false);
      expect(mockChangeDetectorRef.markForCheck).toHaveBeenCalled();
    });

    it('should handle null data fields gracefully', async () => {
      const mockData = {
        enable_reminders: null,
        reminder_interval_days: null,
        enable_auto_archive: null,
        days_before_archive: null
      };
      mockSupabaseService.client.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: mockData, error: null }))
          }))
        }))
      }));

      const originalReminders = component.enableReminders;
      const originalInterval = component.reminderIntervalDays;

      await component.loadSettings();

      expect(component.enableReminders).toBe(originalReminders);
      expect(component.reminderIntervalDays).toBe(originalInterval);
      expect(component.loading).toBe(false);
    });

    it('should handle undefined data fields gracefully', async () => {
      const mockData = {
        enable_reminders: undefined,
        reminder_interval_days: undefined,
        enable_auto_archive: undefined,
        days_before_archive: undefined
      };
      mockSupabaseService.client.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: mockData, error: null }))
          }))
        }))
      }));

      const originalReminders = component.enableReminders;
      const originalInterval = component.reminderIntervalDays;

      await component.loadSettings();

      expect(component.enableReminders).toBe(originalReminders);
      expect(component.reminderIntervalDays).toBe(originalInterval);
      expect(component.loading).toBe(false);
    });

    it('should handle error when loading settings fails', async () => {
      const mockError = { message: 'Database error' };
      mockSupabaseService.client.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: mockError }))
          }))
        }))
      }));

      await component.loadSettings();

      expect(component.error).toBe('Failed to load email settings: Database error');
      expect(component.loading).toBe(false);
      expect(mockChangeDetectorRef.markForCheck).toHaveBeenCalled();
    });

    it('should handle error without message', async () => {
      const mockError = {};
      mockSupabaseService.client.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: mockError }))
          }))
        }))
      }));

      await component.loadSettings();

      expect(component.error).toBe('Failed to load email settings: Unknown error');
      expect(component.loading).toBe(false);
    });

    it('should handle exception when loading settings', async () => {
      mockSupabaseService.client.from = vi.fn(() => {
        throw new Error('Network error');
      });

      await component.loadSettings();

      expect(component.error).toBe('Failed to load email settings: Network error');
      expect(component.loading).toBe(false);
    });
  });

  describe('saveReminderSettings', () => {
    it('should set savingReminders to true initially', async () => {
      component.savingReminders = false;
      const promise = component.saveReminderSettings();
      expect(component.savingReminders).toBe(true);
      await promise;
    });

    it('should save reminder settings successfully', async () => {
      mockSupabaseService.client.from = vi.fn(() => ({
        upsert: vi.fn(() => ({
          select: vi.fn(() => Promise.resolve({ data: {}, error: null }))
        }))
      }));

      component.enableReminders = true;
      component.reminderIntervalDays = 10;
      component.enableAutoArchive = true;
      component.daysBeforeArchive = 5;

      const emitSpy = vi.spyOn(component.onSave, 'emit');

      await component.saveReminderSettings();

      expect(component.successReminders).toBe(true);
      expect(component.error).toBe(null);
      expect(component.savingReminders).toBe(false);
      expect(mockToastService.success).toHaveBeenCalledWith('Prayer reminder settings saved!');
      expect(emitSpy).toHaveBeenCalled();
      expect(mockChangeDetectorRef.markForCheck).toHaveBeenCalled();
    });

    it('should clear success message after 3 seconds', async () => {
      vi.useFakeTimers();
      mockSupabaseService.client.from = vi.fn(() => ({
        upsert: vi.fn(() => ({
          select: vi.fn(() => Promise.resolve({ data: {}, error: null }))
        }))
      }));

      await component.saveReminderSettings();

      expect(component.successReminders).toBe(true);

      vi.advanceTimersByTime(3000);

      expect(component.successReminders).toBe(false);
      expect(mockChangeDetectorRef.markForCheck).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should handle error when saving fails', async () => {
      const mockError = { message: 'Update failed' };
      mockSupabaseService.client.from = vi.fn(() => ({
        upsert: vi.fn(() => ({
          select: vi.fn(() => Promise.resolve({ data: null, error: mockError }))
        }))
      }));

      await component.saveReminderSettings();

      expect(component.error).toBe('Failed to save reminder settings: Update failed');
      expect(component.successReminders).toBe(false);
      expect(component.savingReminders).toBe(false);
      expect(mockToastService.error).toHaveBeenCalledWith('Failed to save reminder settings');
      expect(mockChangeDetectorRef.markForCheck).toHaveBeenCalled();
    });

    it('should handle error without message', async () => {
      const mockError = {};
      mockSupabaseService.client.from = vi.fn(() => ({
        upsert: vi.fn(() => ({
          select: vi.fn(() => Promise.resolve({ data: null, error: mockError }))
        }))
      }));

      await component.saveReminderSettings();

      expect(component.error).toBe('Failed to save reminder settings: Unknown error');
      expect(component.savingReminders).toBe(false);
    });

    it('should handle exception when saving', async () => {
      mockSupabaseService.client.from = vi.fn(() => {
        throw new Error('Network error');
      });

      await component.saveReminderSettings();

      expect(component.error).toBe('Failed to save reminder settings: Network error');
      expect(component.savingReminders).toBe(false);
      expect(mockToastService.error).toHaveBeenCalledWith('Failed to save reminder settings');
    });
  });

  describe('validateReminderDays', () => {
    it('should set reminderIntervalDays to 1 if less than 1', () => {
      component.reminderIntervalDays = 0;
      component.validateReminderDays();
      expect(component.reminderIntervalDays).toBe(1);
    });

    it('should set reminderIntervalDays to 1 if negative', () => {
      component.reminderIntervalDays = -5;
      component.validateReminderDays();
      expect(component.reminderIntervalDays).toBe(1);
    });

    it('should set reminderIntervalDays to 90 if greater than 90', () => {
      component.reminderIntervalDays = 100;
      component.validateReminderDays();
      expect(component.reminderIntervalDays).toBe(90);
    });

    it('should not change reminderIntervalDays if within valid range', () => {
      component.reminderIntervalDays = 30;
      component.validateReminderDays();
      expect(component.reminderIntervalDays).toBe(30);
    });

    it('should handle boundary value 1', () => {
      component.reminderIntervalDays = 1;
      component.validateReminderDays();
      expect(component.reminderIntervalDays).toBe(1);
    });

    it('should handle boundary value 90', () => {
      component.reminderIntervalDays = 90;
      component.validateReminderDays();
      expect(component.reminderIntervalDays).toBe(90);
    });
  });

  describe('validateArchiveDays', () => {
    it('should set daysBeforeArchive to 1 if less than 1', () => {
      component.daysBeforeArchive = 0;
      component.validateArchiveDays();
      expect(component.daysBeforeArchive).toBe(1);
    });

    it('should set daysBeforeArchive to 1 if negative', () => {
      component.daysBeforeArchive = -5;
      component.validateArchiveDays();
      expect(component.daysBeforeArchive).toBe(1);
    });

    it('should set daysBeforeArchive to 90 if greater than 90', () => {
      component.daysBeforeArchive = 100;
      component.validateArchiveDays();
      expect(component.daysBeforeArchive).toBe(90);
    });

    it('should not change daysBeforeArchive if within valid range', () => {
      component.daysBeforeArchive = 30;
      component.validateArchiveDays();
      expect(component.daysBeforeArchive).toBe(30);
    });

    it('should handle boundary value 1', () => {
      component.daysBeforeArchive = 1;
      component.validateArchiveDays();
      expect(component.daysBeforeArchive).toBe(1);
    });

    it('should handle boundary value 90', () => {
      component.daysBeforeArchive = 90;
      component.validateArchiveDays();
      expect(component.daysBeforeArchive).toBe(90);
    });
  });
});
