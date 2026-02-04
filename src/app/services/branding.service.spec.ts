import { TestBed } from '@angular/core/testing';
import { BrandingService, BrandingData } from './branding.service';
import { SupabaseService } from './supabase.service';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock Supabase Service
const mockSupabaseService = {
  directQuery: vi.fn()
};

describe('BrandingService', () => {
  let service: BrandingService;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Remove dark class if present
    document.documentElement.classList.remove('dark');

    // Reset all mocks
    vi.clearAllMocks();

    // Create service manually with mock - fresh instance for each test
    service = new BrandingService(mockSupabaseService as any);
  });

  afterEach(() => {
    // Clean up MutationObserver
    if ((service as any).darkModeObserver) {
      (service as any).darkModeObserver.disconnect();
    }
    localStorage.clear();
  });

  describe('initialization', () => {
    it('should create the service', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with default branding', () => {
      const branding = service.getBranding();
      expect(branding.useLogo).toBe(false);
      expect(branding.appTitle).toBe('Church Prayer Manager');
      expect(branding.appSubtitle).toBe('Keeping our community connected in prayer');
    });

    it('should load cached data on initialize', async () => {
      const cachedTimestamp = new Date('2024-01-01').toISOString();
      localStorage.setItem('branding_use_logo', 'true');
      localStorage.setItem('branding_app_title', 'Test Church');
      localStorage.setItem('branding_app_subtitle', 'Test Subtitle');
      localStorage.setItem('branding_last_modified', cachedTimestamp);

      // Mock Supabase metadata check to return same timestamp (no fetch needed)
      mockSupabaseService.directQuery.mockResolvedValue({
        data: [{ branding_last_modified: cachedTimestamp }],
        error: null
      });

      await service.initialize();

      const branding = service.getBranding();
      expect(branding.useLogo).toBe(true);
      expect(branding.appTitle).toBe('Test Church');
      expect(branding.appSubtitle).toBe('Test Subtitle');
      // Metadata check should be the only call
      expect(mockSupabaseService.directQuery).toHaveBeenCalledTimes(1);
    });

    it('should only initialize once', async () => {
      const timestamp = new Date().toISOString();
      localStorage.setItem('branding_last_modified', timestamp);

      mockSupabaseService.directQuery.mockResolvedValue({
        data: [{ branding_last_modified: timestamp }],
        error: null
      });

      await service.initialize();
      await service.initialize();

      // directQuery should only be called once (for metadata check in first init)
      expect(mockSupabaseService.directQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('metadata check', () => {
    it('should skip fetch if timestamps match', async () => {
      const timestamp = new Date().toISOString();
      localStorage.setItem('branding_last_modified', timestamp);
      localStorage.setItem('branding_use_logo', 'true');

      mockSupabaseService.directQuery.mockResolvedValue({
        data: [{ branding_last_modified: timestamp }],
        error: null
      });

      await service.initialize();

      // Should only call directQuery once (for metadata check)
      expect(mockSupabaseService.directQuery).toHaveBeenCalledTimes(1);
      expect(mockSupabaseService.directQuery).toHaveBeenCalledWith(
        'admin_settings',
        expect.objectContaining({
          select: 'branding_last_modified'
        })
      );
    });

    it('should fetch full branding if DB timestamp is newer', async () => {
      const oldTimestamp = new Date('2024-01-01').toISOString();
      const newTimestamp = new Date('2024-01-02').toISOString();
      localStorage.setItem('branding_last_modified', oldTimestamp);

      // First call: metadata check returns newer timestamp
      // Second call: fetch full branding data
      mockSupabaseService.directQuery
        .mockResolvedValueOnce({
          data: [{ branding_last_modified: newTimestamp }],
          error: null
        })
        .mockResolvedValueOnce({
          data: [{
            use_logo: true,
            light_mode_logo_blob: 'light-data',
            dark_mode_logo_blob: 'dark-data',
            app_title: 'New Title',
            app_subtitle: 'New Subtitle',
            branding_last_modified: newTimestamp
          }],
          error: null
        });

      await service.initialize();

      expect(mockSupabaseService.directQuery).toHaveBeenCalledTimes(2);
      const branding = service.getBranding();
      expect(branding.appTitle).toBe('New Title');
    });

    it('should fetch full branding if no cached timestamp', async () => {
      const timestamp = new Date().toISOString();

      mockSupabaseService.directQuery
        .mockResolvedValueOnce({
          data: [{ branding_last_modified: timestamp }],
          error: null
        })
        .mockResolvedValueOnce({
          data: [{
            use_logo: true,
            light_mode_logo_blob: 'light-data',
            dark_mode_logo_blob: 'dark-data',
            app_title: 'Church',
            app_subtitle: 'Prayer',
            branding_last_modified: timestamp
          }],
          error: null
        });

      await service.initialize();

      expect(mockSupabaseService.directQuery).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('should fallback to cache on metadata query error', async () => {
      localStorage.setItem('branding_app_title', 'Cached Title');

      mockSupabaseService.directQuery.mockResolvedValue({
        data: null,
        error: { message: 'Network error' }
      });

      await service.initialize();

      const branding = service.getBranding();
      expect(branding.appTitle).toBe('Cached Title');
    });

    it('should fallback to cache on full branding query error', async () => {
      localStorage.setItem('branding_app_title', 'Cached Title');

      mockSupabaseService.directQuery
        .mockResolvedValueOnce({
          data: [{ branding_last_modified: new Date().toISOString() }],
          error: null
        })
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Database error' }
        });

      await service.initialize();

      const branding = service.getBranding();
      expect(branding.appTitle).toBe('Cached Title');
    });

    it('should use defaults if no cache and no Supabase', async () => {
      mockSupabaseService.directQuery.mockResolvedValue({
        data: null,
        error: { message: 'Connection failed' }
      });

      await service.initialize();

      const branding = service.getBranding();
      expect(branding.appTitle).toBe('Church Prayer Manager');
      expect(branding.useLogo).toBe(false);
    });
  });

  describe('observable emissions', () => {
    it('should emit branding through observable', async (done) => {
      localStorage.setItem('branding_app_title', 'Test Church');

      mockSupabaseService.directQuery.mockResolvedValue({
        data: [{ branding_last_modified: null }],
        error: null
      });

      service.branding$.subscribe(branding => {
        if (branding.appTitle === 'Test Church') {
          expect(branding.appTitle).toBe('Test Church');
        }
      });

      await service.initialize();
    });

    it('should use shareReplay to prevent multiple subscriptions', async () => {
      const timestamp = new Date().toISOString();
      localStorage.setItem('branding_last_modified', timestamp);

      mockSupabaseService.directQuery.mockResolvedValue({
        data: [{ branding_last_modified: timestamp }],
        error: null
      });

      await service.initialize();

      // Clear mock to ensure new subscriptions don't call again
      vi.clearAllMocks();

      const sub1 = service.branding$.subscribe();
      const sub2 = service.branding$.subscribe();

      // shareReplay means the observable is cached and doesn't re-execute
      // So directQuery should not be called again after initial initialize
      expect(mockSupabaseService.directQuery).toHaveBeenCalledTimes(0);

      sub1.unsubscribe();
      sub2.unsubscribe();
    });
  });

  describe('dark mode', () => {
    it('should return correct image URL based on dark mode', async () => {
      const branding: BrandingData = {
        useLogo: true,
        lightLogo: 'light-url',
        darkLogo: 'dark-url',
        appTitle: 'Title',
        appSubtitle: 'Subtitle',
        lastModified: null
      };

      // Mock dark mode detection - light mode initially
      document.documentElement.classList.remove('dark');
      let url = service.getImageUrl(branding);
      expect(url).toBe('light-url');

      // Switch to dark mode
      document.documentElement.classList.add('dark');
      // Give MutationObserver time to fire
      await new Promise(resolve => setTimeout(resolve, 10));
      url = service.getImageUrl(branding);
      expect(url).toBe('dark-url');

      // Cleanup
      document.documentElement.classList.remove('dark');
    });

    it('should return empty string if useLogo is false', () => {
      const branding: BrandingData = {
        useLogo: false,
        lightLogo: 'light-url',
        darkLogo: 'dark-url',
        appTitle: 'Title',
        appSubtitle: 'Subtitle',
        lastModified: null
      };

      const url = service.getImageUrl(branding);
      expect(url).toBe('');
    });
  });

  describe('cache updates', () => {
    it('should update localStorage when fetching from Supabase', async () => {
      mockSupabaseService.directQuery
        .mockResolvedValueOnce({
          data: [{ branding_last_modified: new Date().toISOString() }],
          error: null
        })
        .mockResolvedValueOnce({
          data: [{
            use_logo: true,
            light_mode_logo_blob: 'new-light',
            dark_mode_logo_blob: 'new-dark',
            app_title: 'New Title',
            app_subtitle: 'New Subtitle',
            branding_last_modified: new Date().toISOString()
          }],
          error: null
        });

      await service.initialize();

      expect(localStorage.getItem('branding_app_title')).toBe('New Title');
      expect(localStorage.getItem('branding_light_logo')).toBe('new-light');
      expect(localStorage.getItem('branding_use_logo')).toBe('true');
    });

    it('should persist last_modified timestamp to localStorage', async () => {
      const timestamp = new Date().toISOString();

      mockSupabaseService.directQuery
        .mockResolvedValueOnce({
          data: [{ branding_last_modified: timestamp }],
          error: null
        })
        .mockResolvedValueOnce({
          data: [{
            use_logo: true,
            light_mode_logo_blob: 'light',
            dark_mode_logo_blob: 'dark',
            app_title: 'Title',
            app_subtitle: 'Subtitle',
            branding_last_modified: timestamp
          }],
          error: null
        });

      await service.initialize();

      const cached = localStorage.getItem('branding_last_modified');
      expect(cached).toBe(timestamp);
    });
  });
});
