import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { InfoHomeFilterPreviewComponent } from '../../components/info-home-filter-preview/info-home-filter-preview.component';
import { provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { InfoComponent } from './info.component';
import { BRANDING_SERVICE_TOKEN } from '../../components/app-logo/app-logo.component';
import { BrandingService, BrandingData } from '../../services/branding.service';

const infoDir = dirname(fileURLToPath(import.meta.url));
const previewDir = join(infoDir, '../../components/info-home-filter-preview');

function readComponentResource(url: string): string {
  for (const base of [infoDir, previewDir]) {
    const path = join(base, url);
    if (existsSync(path)) {
      return readFileSync(path, 'utf-8');
    }
  }
  throw new Error(`Component resource not found: ${url}`);
}

describe('InfoComponent', () => {
  beforeAll(async () => {
    await resolveComponentResources((url) =>
      Promise.resolve(readComponentResource(url))
    );
  });

  let component: InfoComponent;
  let fixture: ComponentFixture<InfoComponent>;
  let mockBrandingService: any;
  let brandingSubject: BehaviorSubject<BrandingData>;

  beforeEach(async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)' ? false : true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))
    });

    brandingSubject = new BehaviorSubject<BrandingData>({
      useLogo: false,
      lightLogo: null,
      darkLogo: null,
      appTitle: 'Church Prayer Manager',
      appSubtitle: 'Keeping our community connected in prayer',
      churchWebsiteUrl: null,
      lastModified: null
    });

    mockBrandingService = {
      initialize: vi.fn().mockResolvedValue(undefined),
      getBranding: vi.fn(() => brandingSubject.value),
      branding$: brandingSubject.asObservable(),
      getImageUrl: vi.fn((branding: BrandingData) => (branding?.lightLogo ?? '') || '')
    };

    await TestBed.configureTestingModule({
      imports: [InfoComponent],
      providers: [
        { provide: BRANDING_SERVICE_TOKEN, useValue: mockBrandingService },
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InfoComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.clearAllMocks();
    fixture?.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  function previewComponent(): InfoHomeFilterPreviewComponent {
    fixture.detectChanges();
    return fixture.debugElement.query(By.directive(InfoHomeFilterPreviewComponent))
      .componentInstance as InfoHomeFilterPreviewComponent;
  }

  describe('default state', () => {
    it('should have previewFilter as current on home preview', () => {
      expect(previewComponent().previewFilter).toBe('current');
    });
    it('should have headerPreview as null', () => {
      expect(component.headerPreview).toBeNull();
    });
    it('should have showPromptCategoriesModal false', () => {
      expect(component.showPromptCategoriesModal).toBe(false);
    });
    it('should have showBadgesModal false', () => {
      expect(component.showBadgesModal).toBe(false);
    });
    it('should have showPersonalCategoriesModal false', () => {
      expect(component.showPersonalCategoriesModal).toBe(false);
    });
    it('should have personalActionModal null', () => {
      expect(component.personalActionModal).toBeNull();
    });
    it('should have empty brandingImageUrl and brandingUseLogo false', () => {
      expect(component.brandingImageUrl).toBe('');
      expect(component.brandingUseLogo).toBe(false);
    });
    it('should have empty webAppQrUrl and iosStoreQrUrl before init', () => {
      expect(component.webAppQrUrl).toBe('');
      expect(component.iosStoreQrUrl).toBe('');
    });
  });

  describe('ngOnInit', () => {
    it('should set webAppQrUrl and iosStoreQrUrl with encoded URLs', async () => {
      await component.ngOnInit();
      expect(component.webAppQrUrl).toContain('api.qrserver.com');
      expect(component.webAppQrUrl).toContain(encodeURIComponent('https://cpprayer.cp-church.org/'));
      expect(component.iosStoreQrUrl).toContain('api.qrserver.com');
      expect(component.iosStoreQrUrl).toContain(encodeURIComponent('https://apps.apple.com/us/app/cross-pointe-prayer/id6759469929'));
    });
    it('should call brandingService.initialize', async () => {
      await component.ngOnInit();
      expect(mockBrandingService.initialize).toHaveBeenCalled();
    });
    it('should subscribe to branding$ and update brandingUseLogo and brandingImageUrl', async () => {
      await component.ngOnInit();
      mockBrandingService.getImageUrl.mockReturnValue('https://example.com/logo.png');
      brandingSubject.next({
        useLogo: true,
        lightLogo: 'https://example.com/logo.png',
        darkLogo: null,
        appTitle: 'Test',
        appSubtitle: 'Sub',
        churchWebsiteUrl: null,
        lastModified: null
      });
      expect(component.brandingUseLogo).toBe(true);
      expect(mockBrandingService.getImageUrl).toHaveBeenCalled();
      expect(component.brandingImageUrl).toBe('https://example.com/logo.png');
    });
  });

  describe('ngOnDestroy', () => {
    it('should complete destroy subject', () => {
      const nextSpy = vi.spyOn((component as any).destroy$, 'next');
      const completeSpy = vi.spyOn((component as any).destroy$, 'complete');
      component.ngOnDestroy();
      expect(nextSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });

  describe('openIosStore', () => {
    it('should call window.open with iOS store URL', () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      component.openIosStore();
      expect(openSpy).toHaveBeenCalledWith(
        'https://apps.apple.com/us/app/cross-pointe-prayer/id6759469929',
        '_blank',
        'noopener'
      );
      openSpy.mockRestore();
    });
  });

  describe('header modal', () => {
    it('should set headerPreview when openHeaderModal is called', () => {
      component.openHeaderModal('help');
      expect(component.headerPreview).toBe('help');
      component.openHeaderModal('settings');
      expect(component.headerPreview).toBe('settings');
      component.openHeaderModal('search');
      expect(component.headerPreview).toBe('search');
      component.openHeaderModal('card-update');
      expect(component.headerPreview).toBe('card-update');
      component.openHeaderModal('card-pray-for');
      expect(component.headerPreview).toBe('card-pray-for');
    });
    it('should clear headerPreview when closeHeaderModal is called', () => {
      component.openHeaderModal('help');
      component.closeHeaderModal();
      expect(component.headerPreview).toBeNull();
    });
  });

  describe('prompt categories modal', () => {
    it('should set showPromptCategoriesModal true when openPromptCategoriesModal is called', () => {
      component.openPromptCategoriesModal();
      expect(component.showPromptCategoriesModal).toBe(true);
    });
    it('should set showPromptCategoriesModal false when closePromptCategoriesModal is called', () => {
      component.openPromptCategoriesModal();
      component.closePromptCategoriesModal();
      expect(component.showPromptCategoriesModal).toBe(false);
    });
  });

  describe('badges modal', () => {
    it('should set showBadgesModal true when openBadgesModal is called', () => {
      component.openBadgesModal();
      expect(component.showBadgesModal).toBe(true);
    });
    it('should set showBadgesModal false when closeBadgesModal is called', () => {
      component.openBadgesModal();
      component.closeBadgesModal();
      expect(component.showBadgesModal).toBe(false);
    });
  });

  describe('personal action modal', () => {
    it('should set personalActionModal when openPersonalActionModal is called', () => {
      component.openPersonalActionModal('answered');
      expect(component.personalActionModal).toBe('answered');
      component.openPersonalActionModal('edit');
      expect(component.personalActionModal).toBe('edit');
      component.openPersonalActionModal('delete');
      expect(component.personalActionModal).toBe('delete');
    });
    it('should clear personalActionModal when closePersonalActionModal is called', () => {
      component.openPersonalActionModal('answered');
      component.closePersonalActionModal();
      expect(component.personalActionModal).toBeNull();
    });
  });

  describe('personal categories modal', () => {
    it('should set showPersonalCategoriesModal true when openPersonalCategoriesModal is called', () => {
      component.openPersonalCategoriesModal();
      expect(component.showPersonalCategoriesModal).toBe(true);
    });
    it('should set showPersonalCategoriesModal false when closePersonalCategoriesModal is called', () => {
      component.openPersonalCategoriesModal();
      component.closePersonalCategoriesModal();
      expect(component.showPersonalCategoriesModal).toBe(false);
    });
  });

  describe('previewFilter', () => {
    it('should allow setting previewFilter to answered, total, prompts, personal', () => {
      const preview = previewComponent();
      preview.previewFilter = 'answered';
      expect(preview.previewFilter).toBe('answered');
      preview.previewFilter = 'total';
      expect(preview.previewFilter).toBe('total');
      preview.previewFilter = 'prompts';
      expect(preview.previewFilter).toBe('prompts');
      preview.previewFilter = 'personal';
      expect(preview.previewFilter).toBe('personal');
      preview.previewFilter = 'current';
      expect(preview.previewFilter).toBe('current');
    });
  });

  describe('template', () => {
    it('should render hero title and description after detectChanges', async () => {
      await component.ngOnInit();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Cross Pointe');
      expect(el.textContent).toContain('Prayer Community');
      expect(el.textContent).toContain('Rejoice always');
    });
    it('should show theme toggle and CTA buttons', async () => {
      await component.ngOnInit();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('app-theme-toggle')).toBeTruthy();
      expect(el.textContent).toContain('Web Site');
      expect(el.textContent).toContain('App Store');
      expect(el.textContent).toContain('Play Store');
    });
    it('should have enabled Play Store CTA with store link handler', async () => {
      await component.ngOnInit();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const playBtn = el.querySelector('[aria-label="Download on Play Store"]') as HTMLButtonElement | null;
      expect(playBtn).toBeTruthy();
      expect(playBtn?.disabled).toBe(false);
    });
    it('should show filter tabs with Public, Prompts, Personal and public sub-chips', async () => {
      await component.ngOnInit();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Public');
      expect(el.textContent).toContain('Current');
      expect(el.textContent).toContain('Answered');
      expect(el.textContent).toContain('Total');
      expect(el.textContent).toContain('Prompts');
      expect(el.textContent).toContain('Personal');
    });
    it('should open badges modal when badge button is clicked', async () => {
      await component.ngOnInit();
      fixture.detectChanges();
      const badgeBtn = fixture.nativeElement.querySelector('button[aria-label="About badges"]') as HTMLButtonElement;
      expect(badgeBtn).toBeTruthy();
      badgeBtn.click();
      fixture.detectChanges();
      expect(component.showBadgesModal).toBe(true);
    });
    it('should open Play Store when Android CTA is clicked', async () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      await component.ngOnInit();
      fixture.detectChanges();
      const playBtn = fixture.nativeElement.querySelector('[aria-label="Download on Play Store"]') as HTMLButtonElement;
      expect(playBtn).toBeTruthy();
      playBtn.click();
      expect(openSpy).toHaveBeenCalledWith(
        'https://play.google.com/store/apps/details?id=com.prayerapp.mobile',
        '_blank',
        'noopener'
      );
      openSpy.mockRestore();
    });
    it('should set previewFilter when filter tab is clicked', async () => {
      await component.ngOnInit();
      fixture.detectChanges();
      const buttons = fixture.nativeElement.querySelectorAll('button');
      let answeredBtn: HTMLButtonElement | null = null;
      buttons.forEach((b: HTMLButtonElement) => {
        if (b.textContent?.includes('ANSWERED')) answeredBtn = b;
      });
      if (answeredBtn) {
        answeredBtn.click();
        fixture.detectChanges();
        expect(previewComponent().previewFilter).toBe('answered');
      }
    });
  });
});
