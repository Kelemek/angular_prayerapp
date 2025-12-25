import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChangeDetectorRef } from '@angular/core';
import { AppBrandingComponent } from './app-branding.component';

describe('AppBrandingComponent', () => {
  let component: AppBrandingComponent;
  let mockSupabaseService: any;
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
          upsert: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }
    };

    mockChangeDetectorRef = {
      detectChanges: vi.fn(),
      markForCheck: vi.fn()
    };

    component = new AppBrandingComponent(
      mockSupabaseService,
      mockChangeDetectorRef as ChangeDetectorRef
    );
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('default property values', () => {
    it('should have default appTitle', () => {
      expect(component.appTitle).toBe('Church Prayer Manager');
    });

    it('should have default appSubtitle', () => {
      expect(component.appSubtitle).toBe('Keeping our community connected in prayer');
    });

    it('should have useLogo default to false', () => {
      expect(component.useLogo).toBe(false);
    });

    it('should have lightModeLogoUrl default to empty string', () => {
      expect(component.lightModeLogoUrl).toBe('');
    });

    it('should have darkModeLogoUrl default to empty string', () => {
      expect(component.darkModeLogoUrl).toBe('');
    });

    it('should have loading default to false', () => {
      expect(component.loading).toBe(false);
    });

    it('should have saving default to false', () => {
      expect(component.saving).toBe(false);
    });

    it('should have uploading default to false', () => {
      expect(component.uploading).toBe(false);
    });

    it('should have error default to null', () => {
      expect(component.error).toBe(null);
    });

    it('should have success default to false', () => {
      expect(component.success).toBe(false);
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
        app_title: 'Test Church',
        app_subtitle: 'Test Subtitle',
        use_logo: true,
        light_mode_logo_blob: 'data:image/png;base64,light',
        dark_mode_logo_blob: 'data:image/png;base64,dark'
      };
      mockSupabaseService.client.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockData, error: null }))
          }))
        }))
      }));

      await component.loadSettings();

      expect(component.appTitle).toBe('Test Church');
      expect(component.appSubtitle).toBe('Test Subtitle');
      expect(component.useLogo).toBe(true);
      expect(component.lightModeLogoUrl).toBe('data:image/png;base64,light');
      expect(component.darkModeLogoUrl).toBe('data:image/png;base64,dark');
      expect(component.loading).toBe(false);
      expect(mockChangeDetectorRef.markForCheck).toHaveBeenCalled();
    });

    it('should handle null data fields gracefully', async () => {
      const mockData = {
        app_title: null,
        app_subtitle: null,
        use_logo: null,
        light_mode_logo_blob: null,
        dark_mode_logo_blob: null
      };
      mockSupabaseService.client.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockData, error: null }))
          }))
        }))
      }));

      const originalTitle = component.appTitle;
      const originalSubtitle = component.appSubtitle;

      await component.loadSettings();

      expect(component.appTitle).toBe(originalTitle);
      expect(component.appSubtitle).toBe(originalSubtitle);
      expect(component.loading).toBe(false);
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

      expect(component.error).toBe('Failed to load branding settings');
      expect(component.loading).toBe(false);
      expect(mockChangeDetectorRef.markForCheck).toHaveBeenCalled();
    });

    it('should handle exception when loading settings', async () => {
      mockSupabaseService.client.from = vi.fn(() => {
        throw new Error('Network error');
      });

      await component.loadSettings();

      expect(component.error).toBe('Failed to load branding settings');
      expect(component.loading).toBe(false);
    });
  });

  describe('onLogoUpload', () => {
    it('should set uploading to true initially', () => {
      const mockFile = new File(['test'], 'test.png', { type: 'image/png' });
      const mockEvent = {
        target: {
          files: [mockFile]
        }
      } as any;

      // Mock FileReader
      const mockFileReader: any = {
        onload: null,
        onerror: null,
        readAsDataURL: vi.fn()
      };
      (global as any).FileReader = function() {
        return mockFileReader;
      };

      component.onLogoUpload(mockEvent, 'light');

      expect(component.uploading).toBe(true);
      expect(component.error).toBe(null);
      expect(mockFileReader.readAsDataURL).toHaveBeenCalledWith(mockFile);
    });

    it('should update lightModeLogoUrl on successful light mode upload', () => {
      const mockFile = new File(['test'], 'test.png', { type: 'image/png' });
      const mockEvent = {
        target: {
          files: [mockFile]
        }
      } as any;

      const base64String = 'data:image/png;base64,test';
      const mockFileReader: any = {
        onload: null,
        onerror: null,
        readAsDataURL: vi.fn()
      };
      (global as any).FileReader = function() {
        return mockFileReader;
      };

      component.onLogoUpload(mockEvent, 'light');

      // Manually trigger onload
      mockFileReader.onload({ target: { result: base64String } });

      expect(component.lightModeLogoUrl).toBe(base64String);
      expect(component.uploading).toBe(false);
      expect(mockChangeDetectorRef.markForCheck).toHaveBeenCalled();
    });

    it('should update darkModeLogoUrl on successful dark mode upload', () => {
      const mockFile = new File(['test'], 'test.png', { type: 'image/png' });
      const mockEvent = {
        target: {
          files: [mockFile]
        }
      } as any;

      const base64String = 'data:image/png;base64,test';
      const mockFileReader: any = {
        onload: null,
        onerror: null,
        readAsDataURL: vi.fn()
      };
      (global as any).FileReader = function() {
        return mockFileReader;
      };

      component.onLogoUpload(mockEvent, 'dark');

      // Manually trigger onload
      mockFileReader.onload({ target: { result: base64String } });

      expect(component.darkModeLogoUrl).toBe(base64String);
      expect(component.uploading).toBe(false);
    });

    it('should handle file read error', () => {
      const mockFile = new File(['test'], 'test.png', { type: 'image/png' });
      const mockEvent = {
        target: {
          files: [mockFile]
        }
      } as any;

      const mockFileReader: any = {
        onload: null,
        onerror: null,
        readAsDataURL: vi.fn()
      };
      (global as any).FileReader = function() {
        return mockFileReader;
      };

      component.onLogoUpload(mockEvent, 'light');

      // Manually trigger onerror
      mockFileReader.onerror();

      expect(component.error).toBe('Failed to read image file');
      expect(component.uploading).toBe(false);
      expect(mockChangeDetectorRef.markForCheck).toHaveBeenCalled();
    });

    it('should do nothing if no file is selected', () => {
      const mockEvent = {
        target: {
          files: []
        }
      } as any;

      const initialUploading = component.uploading;
      component.onLogoUpload(mockEvent, 'light');

      expect(component.uploading).toBe(initialUploading);
    });
  });

  describe('save', () => {
    it('should set saving to true initially', async () => {
      component.saving = false;
      const promise = component.save();
      expect(component.saving).toBe(true);
      await promise;
    });

    it('should save settings successfully', async () => {
      mockSupabaseService.client.from = vi.fn(() => ({
        upsert: vi.fn(() => Promise.resolve({ data: {}, error: null }))
      }));

      component.appTitle = 'New Title';
      component.appSubtitle = 'New Subtitle';
      component.useLogo = true;
      component.lightModeLogoUrl = 'light-url';
      component.darkModeLogoUrl = 'dark-url';

      const emitSpy = vi.spyOn(component.onSave, 'emit');

      await component.save();

      expect(component.success).toBe(true);
      expect(component.error).toBe(null);
      expect(component.saving).toBe(false);
      expect(emitSpy).toHaveBeenCalled();
      expect(mockChangeDetectorRef.markForCheck).toHaveBeenCalled();
    });

    it('should handle empty logo URLs by setting them to null', async () => {
      let savedData: any;
      mockSupabaseService.client.from = vi.fn(() => ({
        upsert: vi.fn((data: any) => {
          savedData = data;
          return Promise.resolve({ data: {}, error: null });
        })
      }));

      component.lightModeLogoUrl = '';
      component.darkModeLogoUrl = '';

      await component.save();

      expect(savedData.light_mode_logo_blob).toBe(null);
      expect(savedData.dark_mode_logo_blob).toBe(null);
    });

    it('should clear success message after 3 seconds', async () => {
      vi.useFakeTimers();
      mockSupabaseService.client.from = vi.fn(() => ({
        upsert: vi.fn(() => Promise.resolve({ data: {}, error: null }))
      }));

      await component.save();

      expect(component.success).toBe(true);

      vi.advanceTimersByTime(3000);

      expect(component.success).toBe(false);
      expect(mockChangeDetectorRef.markForCheck).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should handle error when saving fails', async () => {
      const mockError = { message: 'Update failed' };
      mockSupabaseService.client.from = vi.fn(() => ({
        upsert: vi.fn(() => Promise.resolve({ data: null, error: mockError }))
      }));

      await component.save();

      expect(component.error).toBe('Update failed');
      expect(component.success).toBe(false);
      expect(component.saving).toBe(false);
      expect(mockChangeDetectorRef.markForCheck).toHaveBeenCalled();
    });

    it('should handle error without message', async () => {
      const mockError = {};
      mockSupabaseService.client.from = vi.fn(() => ({
        upsert: vi.fn(() => Promise.resolve({ data: null, error: mockError }))
      }));

      await component.save();

      expect(component.error).toBe('Failed to save settings. Please try again.');
      expect(component.saving).toBe(false);
    });

    it('should handle exception when saving', async () => {
      mockSupabaseService.client.from = vi.fn(() => {
        throw new Error('Network error');
      });

      await component.save();

      expect(component.error).toBe('Network error');
      expect(component.saving).toBe(false);
    });
  });
});
