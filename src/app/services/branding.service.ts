import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';

export interface BrandingData {
  useLogo: boolean;
  lightLogo: string | null;
  darkLogo: string | null;
  appTitle: string;
  appSubtitle: string;
  lastModified: Date | null;
}

@Injectable()
export class BrandingService {
  private readonly LIGHT_LOGO_KEY = 'branding_light_logo';
  private readonly DARK_LOGO_KEY = 'branding_dark_logo';
  private readonly USE_LOGO_KEY = 'branding_use_logo';
  private readonly APP_TITLE_KEY = 'branding_app_title';
  private readonly APP_SUBTITLE_KEY = 'branding_app_subtitle';
  private readonly LAST_MODIFIED_KEY = 'branding_last_modified';

  private brandingSubject = new BehaviorSubject<BrandingData>(this.getDefaultBranding());
  private isDarkMode = false;
  private darkModeObserver: MutationObserver | null = null;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  public branding$ = this.brandingSubject.asObservable().pipe(shareReplay(1));

  constructor(private supabaseService: SupabaseService) {
    this.detectDarkMode();
    this.watchThemeChanges();
  }

  /**
   * Lazy-load branding data on first subscription
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = this.loadBranding();
    await this.initializationPromise;
    this.initialized = true;    
    const branding = this.brandingSubject.value;
    console.log('[BrandingService] Initialization complete:', {
      useLogo: branding.useLogo,
      hasLightLogo: !!branding.lightLogo,
      hasDarkLogo: !!branding.darkLogo,
      appTitle: branding.appTitle,
      lastModified: branding.lastModified?.toISOString()
    });  }

  /**
   * Get the current branding data
   */
  getBranding(): BrandingData {
    return this.brandingSubject.value;
  }

  /**
   * Get image URL based on current dark mode
   */
  getImageUrl(branding: BrandingData): string {
    if (!branding.useLogo) return '';
    return this.isDarkMode ? branding.darkLogo || '' : branding.lightLogo || '';
  }

  /**
   * Load cached branding from window, localStorage, then query Supabase for updates
   */
  private async loadBranding(): Promise<void> {
    try {
      // Step 1: Load from cache
      const cached = this.loadFromCache();
      console.log('[BrandingService] Loaded from cache:', {
        useLogo: cached.useLogo,
        hasLightLogo: !!cached.lightLogo,
        hasDarkLogo: !!cached.darkLogo
      });
      this.brandingSubject.next(cached);

      // Step 2: Check if we need to fetch from Supabase (lightweight metadata check first)
      const shouldFetch = await this.shouldFetchFromSupabase(cached.lastModified);

      if (shouldFetch) {
        console.log('[BrandingService] Logo data changed, fetching from Supabase');
        // Step 3: Fetch full branding data
        await this.fetchFromSupabase();
      } else {
        console.log('[BrandingService] Using cached logo data (no updates)');
      }
    } catch (error) {
      console.warn('[BrandingService] Failed to load branding:', error);
      // Use cached data or defaults on error
    }
  }

  /**
   * Load branding from window cache and localStorage
   * This is synchronous to prevent flash of text logo when image is cached
   */
  private loadFromCache(): BrandingData {
    // Try window cache first (set by index.html)
    const windowCache = (window as any).__cachedLogos;

    // Prefer localStorage over window cache (window cache is stale on second load)
    const lightLogo = localStorage.getItem(this.LIGHT_LOGO_KEY) ?? windowCache?.light ?? null;
    const darkLogo = localStorage.getItem(this.DARK_LOGO_KEY) ?? windowCache?.dark ?? null;
    const useLogo = localStorage.getItem(this.USE_LOGO_KEY);
    const appTitle = localStorage.getItem(this.APP_TITLE_KEY) ?? 'Church Prayer Manager';
    const appSubtitle = localStorage.getItem(this.APP_SUBTITLE_KEY) ?? 'Keeping our community connected in prayer';
    const lastModifiedStr = localStorage.getItem(this.LAST_MODIFIED_KEY);

    return {
      useLogo: (useLogo === 'true') || (windowCache?.useLogo === true),
      lightLogo,
      darkLogo,
      appTitle,
      appSubtitle,
      lastModified: lastModifiedStr ? new Date(lastModifiedStr) : null
    };
  }

  /**
   * Check if we should fetch updated branding from Supabase
   * Uses lightweight metadata query to check branding_last_modified timestamp
   * This prevents fetching large base64 logos when nothing has changed
   */
  private async shouldFetchFromSupabase(cachedLastModified: Date | null): Promise<boolean> {
    try {
      // Query only the branding_last_modified timestamp for fast comparison
      const { data, error } = await this.supabaseService.directQuery<{
        branding_last_modified: string | null;
      }>(
        'admin_settings',
        {
          select: 'branding_last_modified',
          eq: { id: 1 },
          limit: 1,
          timeout: 3000  // Shorter timeout for metadata-only query
        }
      );

      if (error || !data || !Array.isArray(data) || data.length === 0) {
        // Treat as no need to fetch on error (use cache)
        return false;
      }

      const lastModifiedStr = data[0].branding_last_modified;
      
      // No timestamp in DB means no branding configured
      if (!lastModifiedStr) {
        return false;
      }

      const dbLastModified = new Date(lastModifiedStr);

      // If no cached timestamp, we need to fetch full data
      if (!cachedLastModified) {
        return true;
      }

      // Only fetch if DB is newer than cache
      return dbLastModified > cachedLastModified;
    } catch (error) {
      console.warn('[BrandingService] Failed to check metadata:', error);
      // Fall back to cache on error
      return false;
    }
  }

  /**
   * Fetch full branding data from Supabase and update cache
   */
  private async fetchFromSupabase(): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.directQuery<{
        use_logo: boolean;
        light_mode_logo_blob: string | null;
        dark_mode_logo_blob: string | null;
        app_title: string;
        app_subtitle: string;
        branding_last_modified: string | null;
      }>(
        'admin_settings',
        {
          select: 'use_logo, light_mode_logo_blob, dark_mode_logo_blob, app_title, app_subtitle, branding_last_modified',
          eq: { id: 1 },
          limit: 1,
          timeout: 10000
        }
      );

      if (error || !data || !Array.isArray(data) || data.length === 0) {
        return; // Keep using cached data on error
      }

      const settings = data[0];
      const branding: BrandingData = {
        useLogo: settings.use_logo ?? false,
        lightLogo: settings.light_mode_logo_blob || null,
        darkLogo: settings.dark_mode_logo_blob || null,
        appTitle: settings.app_title || 'Church Prayer Manager',
        appSubtitle: settings.app_subtitle || 'Keeping our community connected in prayer',
        lastModified: settings.branding_last_modified ? new Date(settings.branding_last_modified) : null
      };

      // Update cache
      if (branding.useLogo !== null && branding.useLogo !== undefined) {
        localStorage.setItem(this.USE_LOGO_KEY, String(branding.useLogo));
      }
      if (branding.lightLogo) {
        localStorage.setItem(this.LIGHT_LOGO_KEY, branding.lightLogo);
      }
      if (branding.darkLogo) {
        localStorage.setItem(this.DARK_LOGO_KEY, branding.darkLogo);
      }
      if (branding.appTitle) {
        localStorage.setItem(this.APP_TITLE_KEY, branding.appTitle);
      }
      if (branding.appSubtitle) {
        localStorage.setItem(this.APP_SUBTITLE_KEY, branding.appSubtitle);
      }
      if (branding.lastModified) {
        localStorage.setItem(this.LAST_MODIFIED_KEY, branding.lastModified.toISOString());
      }

      // Update observable
      this.brandingSubject.next(branding);
    } catch (error) {
      console.warn('[BrandingService] Failed to fetch branding from Supabase:', error);
      // Keep using cached data on error
    }
  }

  /**
   * Get default branding data
   */
  private getDefaultBranding(): BrandingData {
    return {
      useLogo: false,
      lightLogo: null,
      darkLogo: null,
      appTitle: 'Church Prayer Manager',
      appSubtitle: 'Keeping our community connected in prayer',
      lastModified: null
    };
  }

  /**
   * Detect current dark mode state
   */
  private detectDarkMode(): void {
    this.isDarkMode = document.documentElement.classList.contains('dark');
  }

  /**
   * Watch for dark mode theme changes and update branding
   */
  private watchThemeChanges(): void {
    // Watch for theme changes
    this.darkModeObserver = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark');
      if (isDark !== this.isDarkMode) {
        this.isDarkMode = isDark;
        // Re-emit current branding to trigger logo update in subscribers
        this.brandingSubject.next(this.brandingSubject.value);
      }
    });

    this.darkModeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
  }

  /**
   * Cleanup when service is destroyed
   */
  ngOnDestroy(): void {
    if (this.darkModeObserver) {
      this.darkModeObserver.disconnect();
    }
  }
}
