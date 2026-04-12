import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChangeDetectorRef } from '@angular/core';
import { TestAccountSettingsComponent } from './test-account-settings.component';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

describe('TestAccountSettingsComponent', () => {
  let component: TestAccountSettingsComponent;
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
            eq: vi.fn(() => Promise.resolve({ error: null }))
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

    component = new TestAccountSettingsComponent(
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
      expect(component.testAccountEmail).toBe('');
      expect(component.testAccountCode4).toBe('');
      expect(component.testAccountCode6).toBe('');
      expect(component.testAccountCode8).toBe('');
      expect(component.loading).toBe(false);
      expect(component.saving).toBe(false);
      expect(component.error).toBe(null);
    });

    it('calls loadSettings on first section expand', async () => {
      const loadSettingsSpy = vi.spyOn(component, 'loadSettings');
      component.onSectionToggle();
      expect(loadSettingsSpy).toHaveBeenCalled();
    });
  });

  describe('loadSettings', () => {
    it('should query admin_settings table with id 1 and correct columns', async () => {
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
      expect(selectMock).toHaveBeenCalledWith(
        'test_account_email, test_account_code_4, test_account_code_6, test_account_code_8'
      );
    });

    it('should load settings successfully and populate all fields', async () => {
      const mockData = {
        test_account_email: 'app-test@example.com',
        test_account_code_4: '1777',
        test_account_code_6: '111777',
        test_account_code_8: '11111777'
      };

      mockSupabaseService.client.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: mockData, error: null }))
          }))
        }))
      }));

      await component.loadSettings();

      expect(component.testAccountEmail).toBe('app-test@example.com');
      expect(component.testAccountCode4).toBe('1777');
      expect(component.testAccountCode6).toBe('111777');
      expect(component.testAccountCode8).toBe('11111777');
      expect(component.loading).toBe(false);
      expect(mockChangeDetectorRef.markForCheck).toHaveBeenCalled();
    });

    it('should treat null data fields as empty string', async () => {
      const mockData = {
        test_account_email: null,
        test_account_code_4: null,
        test_account_code_6: null,
        test_account_code_8: null
      };

      mockSupabaseService.client.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: mockData, error: null }))
          }))
        }))
      }));

      await component.loadSettings();

      expect(component.testAccountEmail).toBe('');
      expect(component.testAccountCode4).toBe('');
      expect(component.testAccountCode6).toBe('');
      expect(component.testAccountCode8).toBe('');
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

    it('should set loading to true while loading', async () => {
      let resolvePromise: (value: { data: null; error: null }) => void;
      const promise = new Promise<{ data: null; error: null }>((resolve) => {
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

      resolvePromise!({ data: null, error: null });
      await loadPromise;
      expect(component.loading).toBe(false);
    });
  });

  describe('save functionality', () => {
    it('should call update on admin_settings with trimmed values', async () => {
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

      component.testAccountEmail = '  test@example.com  ';
      component.testAccountCode4 = '1777';
      component.testAccountCode6 = '111777';
      component.testAccountCode8 = '11111777';

      await component.save();

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          test_account_email: 'test@example.com',
          test_account_code_4: '1777',
          test_account_code_6: '111777',
          test_account_code_8: '11111777'
        })
      );
    });

    it('should save empty trimmed values as null', async () => {
      const updateMock = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }));

      mockSupabaseService.client.from = vi.fn(() => ({
        update: updateMock
      }));

      component.testAccountEmail = '   ';
      component.testAccountCode4 = '';
      component.testAccountCode6 = '';
      component.testAccountCode8 = '';

      await component.save();

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          test_account_email: null,
          test_account_code_4: null,
          test_account_code_6: null,
          test_account_code_8: null
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

      expect(mockToastService.success).toHaveBeenCalledWith('Test account settings saved successfully');
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
      let resolvePromise: (value: { error: null }) => void;
      const promise = new Promise<{ error: null }>((resolve) => {
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

      resolvePromise!({ error: null });
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
    it('should allow changing test account fields', () => {
      component.testAccountEmail = 'tester@test.com';
      component.testAccountCode4 = '1234';
      component.testAccountCode6 = '123456';
      component.testAccountCode8 = '12345678';

      expect(component.testAccountEmail).toBe('tester@test.com');
      expect(component.testAccountCode4).toBe('1234');
      expect(component.testAccountCode6).toBe('123456');
      expect(component.testAccountCode8).toBe('12345678');
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
