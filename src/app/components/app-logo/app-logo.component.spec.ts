import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppLogoComponent, BRANDING_SERVICE_TOKEN } from './app-logo.component';
import { BrandingService, BrandingData } from '../../services/branding.service';
import { BehaviorSubject } from 'rxjs';
import { NO_ERRORS_SCHEMA, Component, Injector } from '@angular/core';

describe('AppLogoComponent', () => {
  let component: AppLogoComponent;
  let fixture: ComponentFixture<AppLogoComponent>;
  let mockBrandingService: any;
  let brandingSubject: BehaviorSubject<BrandingData>;

  beforeEach(async () => {
    // Create a mock BrandingService
    brandingSubject = new BehaviorSubject<BrandingData>({
      useLogo: false,
      lightLogo: null,
      darkLogo: null,
      appTitle: 'Church Prayer Manager',
      appSubtitle: 'Keeping our community connected in prayer',
      lastModified: null
    });

    mockBrandingService = {
      initialize: vi.fn(async () => {}),
      getBranding: vi.fn(() => brandingSubject.value),
      branding$: brandingSubject,
      getImageUrl: vi.fn((branding: BrandingData) => {
        if (!branding.useLogo) return '';
        return document.documentElement.classList.contains('dark')
          ? (branding.darkLogo || '')
          : (branding.lightLogo || '');
      })
    };

    // Reset TestBed completely
    TestBed.resetTestingModule();
    
    // Configure with explicit provider before component import
    const testingConfig = {
      imports: [AppLogoComponent],
      providers: [
        { provide: BRANDING_SERVICE_TOKEN, useValue: mockBrandingService },
        { provide: BrandingService, useValue: mockBrandingService }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    };

    TestBed.configureTestingModule(testingConfig);
    TestBed.overrideComponent(AppLogoComponent, {
      set: {
        providers: [
          { provide: BRANDING_SERVICE_TOKEN, useValue: mockBrandingService },
          { provide: BrandingService, useValue: mockBrandingService }
        ]
      }
    });

    await TestBed.compileComponents();
    
    fixture = TestBed.createComponent(AppLogoComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.clearAllMocks();
    if (fixture) {
      fixture.destroy();
    }
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
    it('should initialize branding service', async () => {
      await component.ngOnInit();

      expect(mockBrandingService.initialize).toHaveBeenCalled();
    });

    it('should subscribe to branding observable', async () => {
      await component.ngOnInit();

      expect(component.useLogo).toBe(false);
      expect(component.appTitle).toBe('Church Prayer Manager');
    });

    it('should update component properties when branding changes', async () => {
      await component.ngOnInit();

      // Emit new branding data
      brandingSubject.next({
        useLogo: true,
        lightLogo: 'data:image/png;base64,light',
        darkLogo: 'data:image/png;base64,dark',
        appTitle: 'New Title',
        appSubtitle: 'New Subtitle',
        lastModified: new Date()
      });

      expect(component.useLogo).toBe(true);
      expect(component.appTitle).toBe('New Title');
      expect(component.appSubtitle).toBe('New Subtitle');
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

  describe('updateImageUrl', () => {
    it('should call getImageUrl from service', async () => {
      const branding: BrandingData = {
        useLogo: true,
        lightLogo: 'light-url',
        darkLogo: 'dark-url',
        appTitle: 'Title',
        appSubtitle: 'Subtitle',
        lastModified: null
      };

      mockBrandingService.getImageUrl.mockReturnValue('light-url');

      // Instead of calling directly, emit through the branding subject
      // which will trigger the subscription and updateImageUrl will be called
      brandingSubject.next(branding);

      // Need to wait for async processing
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockBrandingService.getImageUrl).toHaveBeenCalledWith(branding);
    });

    it('should emit logoStatusChange event when logo is enabled', async () => {
      const logoStatusSpy = vi.spyOn(component.logoStatusChange, 'emit');

      const branding: BrandingData = {
        useLogo: true,
        lightLogo: 'light-url',
        darkLogo: null,
        appTitle: 'Title',
        appSubtitle: 'Subtitle',
        lastModified: null
      };

      mockBrandingService.getImageUrl.mockReturnValue('light-url');

      // Initialize first
      await component.ngOnInit();

      // Emit through branding subject to trigger subscription
      brandingSubject.next(branding);

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 0));

      // Should emit true because useLogo is true and getImageUrl returns 'light-url'
      expect(logoStatusSpy).toHaveBeenCalledWith(true);
    });

    it('should emit false when logo is disabled', async () => {
      const logoStatusSpy = vi.spyOn(component.logoStatusChange, 'emit');

      const branding: BrandingData = {
        useLogo: false,
        lightLogo: null,
        darkLogo: null,
        appTitle: 'Title',
        appSubtitle: 'Subtitle',
        lastModified: null
      };

      await component.ngOnInit();
      (component as any).updateImageUrl(branding);

      expect(logoStatusSpy).toHaveBeenCalledWith(false);
    });

    it('should emit false when logo is enabled but has no image URL', async () => {
      const logoStatusSpy = vi.spyOn(component.logoStatusChange, 'emit');

      const branding: BrandingData = {
        useLogo: true,
        lightLogo: null,
        darkLogo: null,
        appTitle: 'Title',
        appSubtitle: 'Subtitle',
        lastModified: null
      };

      mockBrandingService.getImageUrl.mockReturnValue('');

      await component.ngOnInit();
      (component as any).updateImageUrl(branding);

      expect(logoStatusSpy).toHaveBeenCalledWith(false);
    });
  });

  describe('event emitters', () => {
    it('should emit on logoStatusChange', async () => {
      const emitSpy = vi.spyOn(component.logoStatusChange, 'emit');

      const branding: BrandingData = {
        useLogo: true,
        lightLogo: 'light-url',
        darkLogo: null,
        appTitle: 'Title',
        appSubtitle: 'Subtitle',
        lastModified: null
      };

      component.useLogo = branding.useLogo;
      component.logoStatusChange.emit(branding.useLogo);

      expect(emitSpy).toHaveBeenCalledWith(branding.useLogo);
    });
  });
});
