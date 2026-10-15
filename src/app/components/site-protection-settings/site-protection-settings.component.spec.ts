import { describe, it, expect, vi, beforeEach } from 'vitest';
import { wireGatedSupabaseMock } from '../../testing/supabase-service-mock';
import { ChangeDetectorRef } from '@angular/core';
import { SiteProtectionSettingsComponent } from './site-protection-settings.component';

describe('SiteProtectionSettingsComponent', () => {
  let component: SiteProtectionSettingsComponent;
  let mockSupabaseService: any;
  let mockToastService: any;
  let mockAdminAuthService: any;
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
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      }
    };
    wireGatedSupabaseMock(mockSupabaseService);

    mockToastService = {
      success: vi.fn(),
      error: vi.fn()
    };

    mockAdminAuthService = {
      reloadSiteProtectionSetting: vi.fn(() => Promise.resolve())
    };

    mockChangeDetectorRef = {
      detectChanges: vi.fn(),
      markForCheck: vi.fn()
    };

    component = new SiteProtectionSettingsComponent(
      mockSupabaseService,
      mockToastService,
      mockAdminAuthService,
      mockChangeDetectorRef as ChangeDetectorRef
    );
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('default property values', () => {
    it('should have requireSiteLogin default to false', () => {
      expect(component.requireSiteLogin).toBe(false);
    });

    it('should have loading default to false', () => {
      expect(component.loading).toBe(false);
    });

    it('should have saving default to false', () => {
      expect(component.saving).toBe(false);
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
    it('should load settings successfully', async () => {
      const mockData = { require_site_login: true };
      mockSupabaseService.client.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockData, error: null }))
          }))
        }))
      }));

      await component.loadSettings();

      expect(component.requireSiteLogin).toBe(true);
      expect(component.loading).toBe(false);
      expect(mockChangeDetectorRef.markForCheck).toHaveBeenCalled();
    });

    it('should default to false when data is null', async () => {
      await component.loadSettings();
      expect(component.requireSiteLogin).toBe(false);
    });

    it('should handle data with require_site_login false', async () => {
      const mockData = { require_site_login: false };
      mockSupabaseService.client.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockData, error: null }))
          }))
        }))
      }));

      await component.loadSettings();
      expect(component.requireSiteLogin).toBe(false);
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

      expect(mockToastService.error).toHaveBeenCalledWith('Failed to load site protection settings');
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
      component.requireSiteLogin = true;

      mockSupabaseService.client.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }));

      await component.save();

      expect(mockToastService.success).toHaveBeenCalledWith('Site protection settings saved successfully');
      expect(mockAdminAuthService.reloadSiteProtectionSetting).toHaveBeenCalled();
      expect(component.saving).toBe(false);
    });

    it('should save false value successfully', async () => {
      component.requireSiteLogin = false;

      mockSupabaseService.client.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }));

      await component.save();

      expect(mockToastService.success).toHaveBeenCalledWith('Site protection settings saved successfully');
    });

    it('should handle error when saving fails', async () => {
      const mockError = { message: 'Update failed' };
      mockSupabaseService.client.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: mockError }))
        }))
      }));

      await component.save();

      expect(mockToastService.error).toHaveBeenCalledWith('Failed to save site protection settings');
      expect(component.saving).toBe(false);
    });

    it('should set saving to true during save and false after', async () => {
      let resolvePromise: any;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockSupabaseService.client.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => promise)
        }))
      }));

      const savePromise = component.save();
      expect(component.saving).toBe(true);

      resolvePromise({ data: null, error: null });
      await savePromise;

      expect(component.saving).toBe(false);
    });

    it('should call update with correct data', async () => {
      component.requireSiteLogin = true;
      const updateSpy = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }));

      mockSupabaseService.client.from = vi.fn(() => ({
        update: updateSpy
      }));

      await component.save();

      expect(updateSpy).toHaveBeenCalledWith({ require_site_login: true });
    });

    it('should call markForCheck on change detector', async () => {
      await component.save();
      expect(mockChangeDetectorRef.markForCheck).toHaveBeenCalled();
    });
  });
});
