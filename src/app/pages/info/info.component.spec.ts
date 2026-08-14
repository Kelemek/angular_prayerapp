import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from "vitest";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { InfoFeatureOverviewComponent } from "../../components/info-feature-overview/info-feature-overview.component";
import { InfoPreviewModalsComponent } from "../../components/info-preview-modals/info-preview-modals.component";
import { provideRouter } from "@angular/router";
import { BehaviorSubject } from "rxjs";
import { InfoComponent } from "./info.component";
import { BRANDING_SERVICE_TOKEN } from "../../components/app-logo/app-logo.component";
import { BrandingData } from "../../services/branding.service";
import { setupInfoPreviewComponentResources } from "../../components/info-preview-component-resources.spec-helper";

describe("InfoComponent", () => {
  beforeAll(async () => {
    await setupInfoPreviewComponentResources();
  });

  let component: InfoComponent;
  let fixture: ComponentFixture<InfoComponent>;
  let mockBrandingService: {
    initialize: ReturnType<typeof vi.fn>;
    getBranding: ReturnType<typeof vi.fn>;
    branding$: ReturnType<BehaviorSubject<BrandingData>["asObservable"]>;
    getImageUrl: ReturnType<typeof vi.fn>;
  };
  let brandingSubject: BehaviorSubject<BrandingData>;

  beforeEach(async () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === "(prefers-color-scheme: dark)" ? false : true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    brandingSubject = new BehaviorSubject<BrandingData>({
      useLogo: false,
      lightLogo: null,
      darkLogo: null,
      appTitle: "Church Prayer Manager",
      appSubtitle: "Keeping our community connected in prayer",
      churchWebsiteUrl: null,
      lastModified: null,
    });

    mockBrandingService = {
      initialize: vi.fn().mockResolvedValue(undefined),
      getBranding: vi.fn(() => brandingSubject.value),
      branding$: brandingSubject.asObservable(),
      getImageUrl: vi.fn(
        (branding: BrandingData) => (branding?.lightLogo ?? "") || ""
      ),
    };

    await TestBed.configureTestingModule({
      imports: [InfoComponent],
      providers: [
        { provide: BRANDING_SERVICE_TOKEN, useValue: mockBrandingService },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InfoComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.clearAllMocks();
    fixture?.destroy();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  function previewFilter(): string {
    return featureOverview().previewFilter;
  }

  function previewModals(): InfoPreviewModalsComponent {
    fixture.detectChanges();
    return fixture.debugElement.query(
      By.directive(InfoPreviewModalsComponent)
    ).componentInstance as InfoPreviewModalsComponent;
  }

  function featureOverview(): InfoFeatureOverviewComponent {
    fixture.detectChanges();
    return fixture.debugElement.query(
      By.directive(InfoFeatureOverviewComponent)
    ).componentInstance as InfoFeatureOverviewComponent;
  }

  describe("default state", () => {
    it("should have empty brandingImageUrl and brandingUseLogo false", () => {
      expect(component.brandingImageUrl).toBe("");
      expect(component.brandingUseLogo).toBe(false);
    });
  });

  describe("ngOnInit", () => {
    it("should call brandingService.initialize", async () => {
      await component.ngOnInit();
      expect(mockBrandingService.initialize).toHaveBeenCalled();
    });

    it("should subscribe to branding$ and update brandingUseLogo and brandingImageUrl", async () => {
      await component.ngOnInit();
      mockBrandingService.getImageUrl.mockReturnValue(
        "https://example.com/logo.png"
      );
      brandingSubject.next({
        useLogo: true,
        lightLogo: "https://example.com/logo.png",
        darkLogo: null,
        appTitle: "Test",
        appSubtitle: "Sub",
        churchWebsiteUrl: null,
        lastModified: null,
      });
      expect(component.brandingUseLogo).toBe(true);
      expect(mockBrandingService.getImageUrl).toHaveBeenCalled();
      expect(component.brandingImageUrl).toBe("https://example.com/logo.png");
    });
  });

  describe("ngOnDestroy", () => {
    it("should complete destroy subject", () => {
      const nextSpy = vi.spyOn(
        (component as unknown as { destroy$: { next: () => void } }).destroy$,
        "next"
      );
      const completeSpy = vi.spyOn(
        (component as unknown as { destroy$: { complete: () => void } })
          .destroy$,
        "complete"
      );
      component.ngOnDestroy();
      expect(nextSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });

  describe("template", () => {
    it("should render hero title and description after detectChanges", async () => {
      await component.ngOnInit();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain("Cross Pointe");
      expect(el.textContent).toContain("Prayer Community");
      expect(el.textContent).toContain("Rejoice always");
    });

    it("should show theme toggle and CTA buttons", async () => {
      await component.ngOnInit();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector("app-theme-toggle")).toBeTruthy();
      expect(el.textContent).toContain("Web Site");
      expect(el.textContent).toContain("App Store");
      expect(el.textContent).toContain("Play Store");
    });

    it("should show filter tabs with Public, Personal, Prompts and public sub-chips", async () => {
      await component.ngOnInit();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain("Public");
      expect(el.textContent).toContain("Current");
      expect(el.textContent).toContain("Answered");
      expect(el.textContent).toContain("Total");
      expect(el.textContent).toContain("Prompts");
      expect(el.textContent).toContain("Personal");
    });

    it("should open badges modal when badge button is clicked", async () => {
      await component.ngOnInit();
      fixture.detectChanges();
      const badgeBtn = fixture.nativeElement.querySelector(
        'button[aria-label="About badges"]'
      ) as HTMLButtonElement;
      expect(badgeBtn).toBeTruthy();
      badgeBtn.click();
      fixture.detectChanges();
      expect(previewModals().activeModal).toEqual({ kind: "badges" });
    });

    it("should set previewFilter when filter tab is clicked", async () => {
      await component.ngOnInit();
      fixture.detectChanges();
      const buttons = fixture.nativeElement.querySelectorAll("button");
      let answeredBtn: HTMLButtonElement | null = null;
      buttons.forEach((b: HTMLButtonElement) => {
        if (b.textContent?.includes("ANSWERED")) answeredBtn = b;
      });
      if (answeredBtn) {
        answeredBtn.click();
        fixture.detectChanges();
        expect(previewFilter()).toBe("answered");
      }
    });
  });
});
