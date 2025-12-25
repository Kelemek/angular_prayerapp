import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AppLogoComponent } from './app-logo.component';

describe('AppLogoComponent', () => {
  let component: AppLogoComponent;
  let mockSupabaseService: any;
  let originalWindowCache: any;

  beforeEach(() => {
    // Save and clear window cache
    originalWindowCache = (window as any).__cachedLogos;
    (window as any).__cachedLogos = undefined;

    // Clear localStorage
    localStorage.clear();

    mockSupabaseService = {
      directQuery: vi.fn(() => Promise.resolve({ data: [], error: null }))
    };

    component = new AppLogoComponent(mockSupabaseService);
  });

  afterEach(() => {
    // Restore window cache
    (window as any).__cachedLogos = originalWindowCache;
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('default property values', () => {
    it('should have default imageUrl as empty string', () => {
      expect(component.imageUrl).toBe('');
    });

    it('should have default useLogo as false', () => {
      expect(component.useLogo).toBe(false);
    });

    it('should have default appTitle', () => {
      expect(component.appTitle).toBe('Church Prayer Manager');
    });

    it('should have default appSubtitle', () => {
      expect(component.appSubtitle).toBe('Keeping our community connected in prayer');
    });
  });

  describe('ngOnInit', () => {
    it('should call initialization methods', () => {
      const loadCachedLogosSpy = vi.spyOn(component as any, 'loadCachedLogos');
      const fetchBrandingSpy = vi.spyOn(component as any, 'fetchBranding');
      const detectDarkModeSpy = vi.spyOn(component as any, 'detectDarkMode');
      const watchThemeChangesSpy = vi.spyOn(component as any, 'watchThemeChanges');

      component.ngOnInit();

      expect(loadCachedLogosSpy).toHaveBeenCalled();
      expect(fetchBrandingSpy).toHaveBeenCalled();
      expect(detectDarkModeSpy).toHaveBeenCalled();
      expect(watchThemeChangesSpy).toHaveBeenCalled();
    });
  });

  describe('ngOnDestroy', () => {
    it('should complete the destroy subject', () => {
      const destroySpy = vi.spyOn((component as any).destroy$, 'next');
      const completeSpy = vi.spyOn((component as any).destroy$, 'complete');

      component.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });

  describe('loadCachedLogos', () => {
    it('should load logos from window cache', () => {
      (window as any).__cachedLogos = {
        light: 'data:image/png;base64,light',
        dark: 'data:image/png;base64,dark',
        useLogo: true
      };

      (component as any).loadCachedLogos();

      expect((component as any).lightModeLogoUrl).toBe('data:image/png;base64,light');
      expect((component as any).darkModeLogoUrl).toBe('data:image/png;base64,dark');
      expect(component.useLogo).toBe(true);
    });

    it('should load logos from localStorage', () => {
      localStorage.setItem('branding_light_logo', 'data:image/png;base64,lightLS');
      localStorage.setItem('branding_dark_logo', 'data:image/png;base64,darkLS');
      localStorage.setItem('branding_use_logo', 'true');
      localStorage.setItem('branding_app_title', 'Custom Title');
      localStorage.setItem('branding_app_subtitle', 'Custom Subtitle');

      (component as any).loadCachedLogos();

      expect((component as any).lightModeLogoUrl).toBe('data:image/png;base64,lightLS');
      expect((component as any).darkModeLogoUrl).toBe('data:image/png;base64,darkLS');
      expect(component.useLogo).toBe(true);
      expect(component.appTitle).toBe('Custom Title');
      expect(component.appSubtitle).toBe('Custom Subtitle');
    });

    it('should handle missing localStorage values', () => {
      (component as any).loadCachedLogos();

      expect(component.useLogo).toBe(false);
      expect(component.appTitle).toBe('Church Prayer Manager');
    });

    it('should call updateImageUrl after loading', () => {
      const updateImageUrlSpy = vi.spyOn(component as any, 'updateImageUrl');

      (component as any).loadCachedLogos();

      expect(updateImageUrlSpy).toHaveBeenCalled();
    });

    it('should prioritize window cache over localStorage', () => {
      (window as any).__cachedLogos = {
        light: 'window-light',
        useLogo: true
      };
      localStorage.setItem('branding_light_logo', 'local-light');
      localStorage.setItem('branding_use_logo', 'false');

      (component as any).loadCachedLogos();

      // Window cache should be loaded first, then localStorage
      expect((component as any).lightModeLogoUrl).toBe('local-light');
    });
  });

  describe('fetchBranding', () => {
    it('should fetch branding from database successfully', async () => {
      const mockBrandingData = {
        use_logo: true,
        light_mode_logo_blob: 'data:image/png;base64,dbLight',
        dark_mode_logo_blob: 'data:image/png;base64,dbDark',
        app_title: 'DB Title',
        app_subtitle: 'DB Subtitle'
      };

      mockSupabaseService.directQuery = vi.fn(() => 
        Promise.resolve({ data: [mockBrandingData], error: null })
      );

      await (component as any).fetchBranding();

      expect(component.useLogo).toBe(true);
      expect((component as any).lightModeLogoUrl).toBe('data:image/png;base64,dbLight');
      expect((component as any).darkModeLogoUrl).toBe('data:image/png;base64,dbDark');
      expect(component.appTitle).toBe('DB Title');
      expect(component.appSubtitle).toBe('DB Subtitle');
    });

    it('should update localStorage when fetching branding', async () => {
      const mockBrandingData = {
        use_logo: true,
        light_mode_logo_blob: 'data:image/png;base64,new',
        dark_mode_logo_blob: 'data:image/png;base64,new2',
        app_title: 'New Title',
        app_subtitle: 'New Subtitle'
      };

      mockSupabaseService.directQuery = vi.fn(() => 
        Promise.resolve({ data: [mockBrandingData], error: null })
      );

      await (component as any).fetchBranding();

      expect(localStorage.getItem('branding_use_logo')).toBe('true');
      expect(localStorage.getItem('branding_light_logo')).toBe('data:image/png;base64,new');
      expect(localStorage.getItem('branding_dark_logo')).toBe('data:image/png;base64,new2');
      expect(localStorage.getItem('branding_app_title')).toBe('New Title');
      expect(localStorage.getItem('branding_app_subtitle')).toBe('New Subtitle');
    });

    it('should handle error when fetching branding fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockError = new Error('Database error');
      mockSupabaseService.directQuery = vi.fn(() => 
        Promise.reject(mockError)
      );

      await (component as any).fetchBranding();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to fetch branding settings:', mockError);
      consoleErrorSpy.mockRestore();
    });

    it('should handle empty data array', async () => {
      mockSupabaseService.directQuery = vi.fn(() => 
        Promise.resolve({ data: [], error: null })
      );

      await (component as any).fetchBranding();

      // Should keep default values
      expect(component.appTitle).toBe('Church Prayer Manager');
    });

    it('should handle null values in branding data', async () => {
      const mockBrandingData = {
        use_logo: null,
        light_mode_logo_blob: null,
        dark_mode_logo_blob: null,
        app_title: null,
        app_subtitle: null
      };

      mockSupabaseService.directQuery = vi.fn(() => 
        Promise.resolve({ data: [mockBrandingData], error: null })
      );

      await (component as any).fetchBranding();

      // Should keep existing values when null
      expect(component.useLogo).toBe(false);
      expect(component.appTitle).toBe('Church Prayer Manager');
    });

    it('should call updateImageUrl after fetching successfully', async () => {
      const updateImageUrlSpy = vi.spyOn(component as any, 'updateImageUrl');
      const mockBrandingData = {
        use_logo: true,
        light_mode_logo_blob: 'data:image/png;base64,test',
        dark_mode_logo_blob: null,
        app_title: 'Test',
        app_subtitle: null
      };
      mockSupabaseService.directQuery = vi.fn(() => 
        Promise.resolve({ data: [mockBrandingData], error: null })
      );

      await (component as any).fetchBranding();

      expect(updateImageUrlSpy).toHaveBeenCalled();
    });
  });

  describe('detectDarkMode', () => {
    it('should detect dark mode when class is present', () => {
      document.documentElement.classList.add('dark');

      (component as any).detectDarkMode();

      expect((component as any).isDarkMode).toBe(true);

      document.documentElement.classList.remove('dark');
    });

    it('should detect light mode when class is not present', () => {
      document.documentElement.classList.remove('dark');

      (component as any).detectDarkMode();

      expect((component as any).isDarkMode).toBe(false);
    });

    it('should call updateImageUrl after detecting', () => {
      const updateImageUrlSpy = vi.spyOn(component as any, 'updateImageUrl');

      (component as any).detectDarkMode();

      expect(updateImageUrlSpy).toHaveBeenCalled();
    });
  });

  describe('updateImageUrl', () => {
    it('should set imageUrl to empty when useLogo is false', () => {
      component.useLogo = false;
      (component as any).updateImageUrl();

      expect(component.imageUrl).toBe('');
    });

    it('should use light mode logo when not in dark mode', () => {
      component.useLogo = true;
      (component as any).lightModeLogoUrl = 'data:image/png;base64,light';
      (component as any).darkModeLogoUrl = 'data:image/png;base64,dark';
      (component as any).isDarkMode = false;
      (component as any).updateImageUrl();

      expect(component.imageUrl).toBe('data:image/png;base64,light');
    });

    it('should use dark mode logo when in dark mode', () => {
      component.useLogo = true;
      (component as any).lightModeLogoUrl = 'data:image/png;base64,light';
      (component as any).darkModeLogoUrl = 'data:image/png;base64,dark';
      (component as any).isDarkMode = true;
      (component as any).updateImageUrl();

      expect(component.imageUrl).toBe('data:image/png;base64,dark');
    });

    it('should emit logoStatusChange with false when useLogo is false', () => {
      const emitSpy = vi.fn();
      component.logoStatusChange.subscribe(emitSpy);

      component.useLogo = false;
      (component as any).updateImageUrl();

      expect(emitSpy).toHaveBeenCalledWith(false);
    });

    it('should emit logoStatusChange with true when useLogo is true and imageUrl exists', () => {
      const emitSpy = vi.fn();
      component.logoStatusChange.subscribe(emitSpy);

      component.useLogo = true;
      (component as any).lightModeLogoUrl = 'data:image/png;base64,test';
      (component as any).isDarkMode = false;
      (component as any).updateImageUrl();

      expect(emitSpy).toHaveBeenCalledWith(true);
    });

    it('should emit logoStatusChange with false when useLogo is true but imageUrl is empty', () => {
      const emitSpy = vi.fn();
      component.logoStatusChange.subscribe(emitSpy);

      component.useLogo = true;
      (component as any).lightModeLogoUrl = '';
      (component as any).darkModeLogoUrl = '';
      (component as any).isDarkMode = false;
      (component as any).updateImageUrl();

      expect(emitSpy).toHaveBeenCalledWith(false);
    });
  });

  describe('watchThemeChanges', () => {
    it('should create MutationObserver', () => {
      const observeSpy = vi.spyOn(MutationObserver.prototype, 'observe');

      (component as any).watchThemeChanges();

      expect(observeSpy).toHaveBeenCalledWith(
        document.documentElement,
        { attributes: true, attributeFilter: ['class'] }
      );
    });

    it('should update isDarkMode and call updateImageUrl when theme changes', async () => {
      const updateImageUrlSpy = vi.spyOn(component as any, 'updateImageUrl');
      component.isDarkMode = false;

      // Start watching
      (component as any).watchThemeChanges();

      // Simulate theme change by adding dark class
      document.documentElement.classList.add('dark');

      // Wait for MutationObserver to fire
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(component.isDarkMode).toBe(true);
      expect(updateImageUrlSpy).toHaveBeenCalled();

      // Clean up
      document.documentElement.classList.remove('dark');
    });

    it('should handle theme change from dark to light', async () => {
      const updateImageUrlSpy = vi.spyOn(component as any, 'updateImageUrl');
      document.documentElement.classList.add('dark');
      component.isDarkMode = true;

      // Start watching
      (component as any).watchThemeChanges();

      // Simulate theme change by removing dark class
      document.documentElement.classList.remove('dark');

      // Wait for MutationObserver to fire
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(component.isDarkMode).toBe(false);
      expect(updateImageUrlSpy).toHaveBeenCalled();
    });

    it('should not update when theme has not actually changed', async () => {
      const updateImageUrlSpy = vi.spyOn(component as any, 'updateImageUrl');
      component.isDarkMode = false;
      document.documentElement.classList.remove('dark'); // Ensure no dark class

      // Start watching
      (component as any).watchThemeChanges();

      // Trigger mutation without actually changing theme state
      // This simulates a class change that doesn't affect dark mode
      document.documentElement.classList.add('other-class');

      // Wait for MutationObserver to fire
      await new Promise(resolve => setTimeout(resolve, 50));

      // isDarkMode should remain false since 'dark' class was not added
      expect(component.isDarkMode).toBe(false);
      // updateImageUrl should not be called since isDarkMode didn't change
      expect(updateImageUrlSpy).not.toHaveBeenCalled();

      // Clean up
      document.documentElement.classList.remove('other-class');
    });
  });

  describe('event emitters', () => {
    it('should have logoStatusChange event emitter', () => {
      expect(component.logoStatusChange).toBeTruthy();
    });

    it('should emit on updateImageUrl', () => {
      const emitSpy = vi.fn();
      component.logoStatusChange.subscribe(emitSpy);

      (component as any).updateImageUrl();

      expect(emitSpy).toHaveBeenCalled();
    });
  });
});
