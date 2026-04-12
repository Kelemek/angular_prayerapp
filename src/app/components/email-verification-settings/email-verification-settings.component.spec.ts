import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChangeDetectorRef } from '@angular/core';
import { EmailVerificationSettingsComponent } from './email-verification-settings.component';

describe('EmailVerificationSettingsComponent', () => {
  let component: EmailVerificationSettingsComponent;
  let mockSupabaseService: any;
  let mockToastService: any;
  let mockChangeDetectorRef: any;

  beforeEach(() => {
    mockSupabaseService = {
      client: {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: null }))
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

    component = new EmailVerificationSettingsComponent(
      mockSupabaseService,
      mockToastService,
      mockChangeDetectorRef as ChangeDetectorRef
    );
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('default property values', () => {
    it('should have verificationCodeLength default to 6', () => {
      expect(component.verificationCodeLength).toBe(6);
    });

    it('should have verificationCodeExpiryMinutes default to 15', () => {
      expect(component.verificationCodeExpiryMinutes).toBe(15);
    });

    it('should have loading default to false', () => {
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
      expect(loadSettingsSpy).toHaveBeenCalledTimes(1);
      component.onSectionToggle();
      component.onSectionToggle();
      expect(loadSettingsSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('loadSettings', () => {
    it('should load settings successfully', async () => {
      const mockData = {
        verification_code_length: 8,
        verification_code_expiry_minutes: 30
      };
      mockSupabaseService.client.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockData, error: null }))
          }))
        }))
      }));

      await component.loadSettings();

      expect(component.verificationCodeLength).toBe(8);
      expect(component.verificationCodeExpiryMinutes).toBe(30);
      expect(component.loading).toBe(false);
      expect(mockChangeDetectorRef.markForCheck).toHaveBeenCalled();
    });

    it('should use default values when data is null', async () => {
      await component.loadSettings();

      expect(component.verificationCodeLength).toBe(6);
      expect(component.verificationCodeExpiryMinutes).toBe(15);
    });

    it('should use default values when properties are null', async () => {
      const mockData = {
        verification_code_length: null,
        verification_code_expiry_minutes: null
      };
      mockSupabaseService.client.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockData, error: null }))
          }))
        }))
      }));

      await component.loadSettings();

      expect(component.verificationCodeLength).toBe(6);
      expect(component.verificationCodeExpiryMinutes).toBe(15);
    });

    it('should handle partial data correctly', async () => {
      const mockData = {
        verification_code_length: 4,
        verification_code_expiry_minutes: null
      };
      mockSupabaseService.client.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockData, error: null }))
          }))
        }))
      }));

      await component.loadSettings();

      expect(component.verificationCodeLength).toBe(4);
      expect(component.verificationCodeExpiryMinutes).toBe(15);
    });

    it('should handle error when loading settings fails', async () => {
      const mockError = { message: 'Database error' };
      mockSupabaseService.client.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: mockError }))
          }))
        }))
      }));

      await component.loadSettings();

      expect(mockToastService.error).toHaveBeenCalledWith('Failed to load email verification settings');
    });

    it('should set loading to true during load and false after', async () => {
      let resolvePromise: any;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockSupabaseService.client.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => promise)
          }))
        }))
      }));

      const loadPromise = component.loadSettings();
      expect(component.loading).toBe(true);

      resolvePromise({ data: null, error: null });
      await loadPromise;

      expect(component.loading).toBe(false);
    });

    it('should call markForCheck on change detector', async () => {
      await component.loadSettings();
      expect(mockChangeDetectorRef.markForCheck).toHaveBeenCalled();
    });
  });

  describe('save', () => {
    it('should save settings successfully', async () => {
      component.verificationCodeLength = 8;
      component.verificationCodeExpiryMinutes = 30;

      mockSupabaseService.client.from = vi.fn(() => ({
        upsert: vi.fn(() => ({
          select: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }));

      await component.save();

      expect(mockToastService.success).toHaveBeenCalledWith('Email verification settings saved successfully');
      expect(component.saving).toBe(false);
    });

    it('should handle error when saving fails', async () => {
      const mockError = { message: 'Upsert failed' };
      mockSupabaseService.client.from = vi.fn(() => ({
        upsert: vi.fn(() => ({
          select: vi.fn(() => Promise.resolve({ data: null, error: mockError }))
        }))
      }));

      await component.save();

      expect(mockToastService.error).toHaveBeenCalledWith('Failed to save email verification settings');
      expect(component.saving).toBe(false);
    });

    it('should set saving to true during save and false after', async () => {
      let resolvePromise: any;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockSupabaseService.client.from = vi.fn(() => ({
        upsert: vi.fn(() => ({
          select: vi.fn(() => promise)
        }))
      }));

      const savePromise = component.save();
      expect(component.saving).toBe(true);

      resolvePromise({ data: null, error: null });
      await savePromise;

      expect(component.saving).toBe(false);
    });

    it('should upsert with correct data', async () => {
      component.verificationCodeLength = 4;
      component.verificationCodeExpiryMinutes = 10;

      const upsertSpy = vi.fn(() => ({
        select: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }));

      mockSupabaseService.client.from = vi.fn(() => ({
        upsert: upsertSpy
      }));

      await component.save();

      expect(upsertSpy).toHaveBeenCalledWith({
        id: 1,
        require_email_verification: true,
        verification_code_length: 4,
        verification_code_expiry_minutes: 10
      });
    });

    it('should always set require_email_verification to true', async () => {
      const upsertSpy = vi.fn(() => ({
        select: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }));

      mockSupabaseService.client.from = vi.fn(() => ({
        upsert: upsertSpy
      }));

      await component.save();

      expect(upsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ require_email_verification: true })
      );
    });

    it('should call markForCheck on change detector', async () => {
      await component.save();
      expect(mockChangeDetectorRef.markForCheck).toHaveBeenCalled();
    });
  });
});
