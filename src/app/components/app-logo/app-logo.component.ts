import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="useLogo && imageUrl" class="min-w-0 flex-1">
      <img 
        [src]="imageUrl" 
        alt="Church Logo" 
        class="h-16 w-auto max-w-xs object-contain"
        width="256"
        height="64"
      />
    </div>
  `,
  styles: []
})
export class AppLogoComponent implements OnInit, OnDestroy {
  imageUrl: string = '';
  useLogo = false;
  @Output() logoStatusChange = new EventEmitter<boolean>();
  
  private isDarkMode = false;
  private lightModeLogoUrl = '';
  private darkModeLogoUrl = '';
  private destroy$ = new Subject<void>();

  constructor(private supabaseService: SupabaseService) {}

  ngOnInit() {
    console.log('AppLogo: ngOnInit');
    this.loadCachedLogos();
    this.fetchBranding();
    this.detectDarkMode();
    this.watchThemeChanges();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCachedLogos() {
    // Load from window cache first (set by index.html script)
    const windowCache = (window as any).__cachedLogos;
    console.log('AppLogo: windowCache', windowCache);
    
    if (windowCache?.light) {
      this.lightModeLogoUrl = windowCache.light;
    }
    if (windowCache?.dark) {
      this.darkModeLogoUrl = windowCache.dark;
    }
    if (windowCache?.useLogo !== undefined) {
      this.useLogo = windowCache.useLogo;
    }

    // Also check localStorage directly
    const lightLogo = localStorage.getItem('branding_light_logo');
    const darkLogo = localStorage.getItem('branding_dark_logo');
    const useLogo = localStorage.getItem('branding_use_logo');
    
    console.log('AppLogo: localStorage', { 
      lightLogo: lightLogo?.substring(0, 50), 
      darkLogo: darkLogo?.substring(0, 50), 
      useLogo 
    });

    if (lightLogo) this.lightModeLogoUrl = lightLogo;
    if (darkLogo) this.darkModeLogoUrl = darkLogo;
    if (useLogo) this.useLogo = useLogo === 'true';
    
    console.log('AppLogo: after load', { useLogo: this.useLogo, lightModeLogoUrl: this.lightModeLogoUrl?.substring(0, 50) });

    this.updateImageUrl();
  }

  private async fetchBranding() {
    try {
      const { data, error } = await this.supabaseService.directQuery<{
        use_logo: boolean;
        light_mode_logo_blob: string;
        dark_mode_logo_blob: string;
      }>(
        'admin_settings',
        {
          select: 'use_logo, light_mode_logo_blob, dark_mode_logo_blob',
          eq: { id: 1 },
          limit: 1
        }
      );

      if (!error && data && Array.isArray(data) && data.length > 0) {
        const settings = data[0];
        
        if (settings.use_logo !== null && settings.use_logo !== undefined) {
          this.useLogo = settings.use_logo;
          localStorage.setItem('branding_use_logo', String(settings.use_logo));
        }
        
        if (settings.light_mode_logo_blob) {
          this.lightModeLogoUrl = settings.light_mode_logo_blob;
          localStorage.setItem('branding_light_logo', settings.light_mode_logo_blob);
        }
        
        if (settings.dark_mode_logo_blob) {
          this.darkModeLogoUrl = settings.dark_mode_logo_blob;
          localStorage.setItem('branding_dark_logo', settings.dark_mode_logo_blob);
        }

        this.updateImageUrl();
      }
    } catch (error) {
      console.error('Failed to fetch branding settings:', error);
    }
  }

  private detectDarkMode() {
    this.isDarkMode = document.documentElement.classList.contains('dark');
    this.updateImageUrl();
  }

  private watchThemeChanges() {
    // Watch for theme changes
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark');
      if (isDark !== this.isDarkMode) {
        this.isDarkMode = isDark;
        this.updateImageUrl();
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
  }

  private updateImageUrl() {
    if (!this.useLogo) {
      this.imageUrl = '';
      this.logoStatusChange.emit(false);
      return;
    }

    this.imageUrl = this.isDarkMode ? this.darkModeLogoUrl : this.lightModeLogoUrl;
    const hasLogo = this.useLogo && !!this.imageUrl;
    console.log('AppLogo: updateImageUrl', { isDarkMode: this.isDarkMode, hasLogo, imageUrl: this.imageUrl?.substring(0, 50) });
    this.logoStatusChange.emit(hasLogo);
  }
}
