import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChangeDetectorRef } from '@angular/core';
import { SecurityPolicySettingsComponent } from './security-policy-settings.component';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

describe('SecurityPolicySettingsComponent', () => {
  let component: SecurityPolicySettingsComponent;
  let mockSupabaseService: any;
  let mockToastService: any;
  let mockChangeDetectorRef: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabaseService = {
      client: {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
            }))
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
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

    component = new SecurityPolicySettingsComponent(
      mockSupabaseService,
      mockToastService,
      mockChangeDetectorRef as ChangeDetectorRef
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('component initialization', () => {
    it('should initialize with default values', () => {
      expect(component.deletionsAllowed).toBe('everyone');
      expect(component.updatesAllowed).toBe('everyone');
      expect(component.loading).toBe(false);
      expect(component.saving).toBe(false);
      expect(component.error).toBe(null);
    });

    it('should call loadSettings on init', async () => {
      const loadSettingsSpy = vi.spyOn(component, 'loadSettings');
      await component.ngOnInit();
      expect(loadSettingsSpy).toHaveBeenCalled();
    });
  });

  describe('loadSettings', () => {
    it('should query admin_settings table with id 1', async () => {
      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }));

      mockSupabaseService.client.from = vi.fn(() => ({
        select: selectMock
      }));

      await component.loadSettings();

      expect(mockSupabaseService.client.from).toHaveBeenCalledWith('admin_settings');
      expect(selectMock).toHaveBeenCalledWith('deletions_allowed, updates_allowed');
    });

    it('should load settings successfully', async () => {
      const mockData = {
        deletions_allowed: 'admin-only',
        updates_allowed: 'original-requestor'
      };

      mockSupabaseService.client.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: mockData, error: null }))
          }))
        }))
      }));

      await component.loadSettings();

      expect(component.deletionsAllowed).toBe('admin-only');
      expect(component.updatesAllowed).toBe('original-requestor');
      expect(component.loading).toBe(false);
      expect(mockChangeDetectorRef.markForCheck).toHaveBeenCalled();
    });

    it('should handle errors when loading settings', async () => {
      const mockError = new Error('Database error');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockSupabaseService.client.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: mockError }))
          }))
        }))
      }));

      await component.loadSettings();

      expect(component.error).toBe('Failed to load settings');
      expect(component.loading).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should keep default values when no data is returned', async () => {
      await component.loadSettings();

      expect(component.deletionsAllowed).toBe('everyone');
      expect(component.updatesAllowed).toBe('everyone');
    });

    it('should set loading to true while loading', async () => {
      let resolvePromise: any;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockSupabaseService.client.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => promise)
          }))
        }))
      }));

      const loadPromise = component.loadSettings();
      await Promise.resolve();
      expect(component.loading).toBe(true);

      resolvePromise({ data: null, error: null });
      await loadPromise;
      expect(component.loading).toBe(false);
    });
  });

  describe('save functionality', () => {
    it('should call update on admin_settings table', async () => {
      const updateMock = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }));

      mockSupabaseService.client.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        })),
        update: updateMock
      }));

      component.deletionsAllowed = 'admin-only';
      component.updatesAllowed = 'original-requestor';

      await component.save();

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          deletions_allowed: 'admin-only',
          updates_allowed: 'original-requestor'
        })
      );
    });

    it('should include updated_at timestamp when saving', async () => {
      const updateMock = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }));

      mockSupabaseService.client.from = vi.fn(() => ({
        update: updateMock
      }));

      await component.save();

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          updated_at: expect.any(String)
        })
      );
    });

    it('should show success toast on successful save', async () => {
      mockSupabaseService.client.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      }));

      await component.save();

      expect(mockToastService.success).toHaveBeenCalledWith('Security policy settings saved successfully');
    });

    it('should set error and show error toast on failed save', async () => {
      const mockError = new Error('Update failed');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockSupabaseService.client.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: mockError }))
        }))
      }));

      await component.save();

      expect(component.error).toBe('Failed to save settings');
      expect(mockToastService.error).toHaveBeenCalledWith('Failed to save settings');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should set saving to true during save operation', async () => {
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
      await Promise.resolve();

      expect(component.saving).toBe(true);

      resolvePromise({ error: null });
      await savePromise;

      expect(component.saving).toBe(false);
    });

    it('should clear error when saving', async () => {
      mockSupabaseService.client.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      }));

      component.error = 'Previous error';
      await component.save();

      expect(component.error).toBe(null);
    });

    it('should update with eq filter for id 1', async () => {
      const eqMock = vi.fn(() => Promise.resolve({ error: null }));
      mockSupabaseService.client.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: eqMock
        }))
      }));

      await component.save();

      expect(eqMock).toHaveBeenCalledWith('id', 1);
    });
  });

  describe('property updates', () => {
    it('should allow changing deletionsAllowed', () => {
      component.deletionsAllowed = 'admin-only';
      expect(component.deletionsAllowed).toBe('admin-only');

      component.deletionsAllowed = 'original-requestor';
      expect(component.deletionsAllowed).toBe('original-requestor');
    });

    it('should allow changing updatesAllowed', () => {
      component.updatesAllowed = 'admin-only';
      expect(component.updatesAllowed).toBe('admin-only');

      component.updatesAllowed = 'original-requestor';
      expect(component.updatesAllowed).toBe('original-requestor');
    });
  });

  describe('error handling', () => {
    it('should clear error on successful load', async () => {
      component.error = 'Previous error';

      mockSupabaseService.client.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      }));

      await component.loadSettings();

      expect(component.error).toBe(null);
    });

    it('should handle thrown errors during load', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockSupabaseService.client.from = vi.fn(() => {
        throw new Error('Connection error');
      });

      await component.loadSettings();

      expect(component.error).toBe('Failed to load settings');
      expect(component.loading).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle thrown errors during save', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockSupabaseService.client.from = vi.fn(() => {
        throw new Error('Connection error');
      });

      await component.save();

      expect(component.error).toBe('Failed to save settings');
      expect(component.saving).toBe(false);
      expect(mockToastService.error).toHaveBeenCalledWith('Failed to save settings');
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
