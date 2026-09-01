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

    it("should show filter tabs with Church, Personal, Memorize, and Church chips including Prompts", async () => {
      await component.ngOnInit();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const previewTabs = el.querySelector(
        "app-info-home-filter-preview-tabs"
      ) as HTMLElement | null;
      const previewText = previewTabs?.textContent?.replace(/\s+/g, " ") ?? "";
      expect(previewText).toContain("Church");
      expect(previewText).toContain("Current");
      expect(previewText).toContain("Answered");
      expect(previewText).toContain("Total");
      expect(previewText).toContain("Prompts");
      expect(previewText).toContain("Personal");
      expect(previewText).toContain("Memorize");
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
      expect(
        fixture.nativeElement.querySelector(".modal-shell-overlay")
      ).toBeTruthy();
    });

    it("renders explanation modals outside the zoomed book frame", async () => {
      await component.ngOnInit();
      fixture.detectChanges();
      const scaled = fixture.nativeElement.querySelector(
        ".info-page-body-scaled"
      ) as HTMLElement;
      const modals = fixture.nativeElement.querySelector(
        "app-info-preview-modals"
      ) as HTMLElement;
      expect(modals).toBeTruthy();
      expect(scaled.contains(modals)).toBe(false);

      const prayBtn = Array.from(
        fixture.nativeElement.querySelectorAll("button")
      ).find((button) => button.textContent?.trim() === "Pray") as
        | HTMLButtonElement
        | undefined;
      expect(prayBtn).toBeTruthy();
      prayBtn!.click();
      fixture.detectChanges();

      expect(previewModals().activeModal).toEqual({
        kind: "header",
        action: "pray",
      });
      expect(
        fixture.nativeElement.querySelector(".modal-shell-overlay")
      ).toBeTruthy();
      expect(fixture.nativeElement.textContent).toContain("Pray view");
    });

    it("opens a Bible Books explanation about memorizing book names", async () => {
      await component.ngOnInit();
      fixture.detectChanges();
      const memorizeTab = fixture.nativeElement.querySelector(
        "#tour-filter-memorize"
      ) as HTMLButtonElement;
      memorizeTab.click();
      fixture.detectChanges();

      const bibleBooks = [
        ...fixture.nativeElement.querySelectorAll("button"),
      ].find(
        (button: HTMLButtonElement) =>
          button.textContent?.trim() === "Bible Books"
      ) as HTMLButtonElement;
      bibleBooks.click();
      fixture.detectChanges();

      expect(previewModals().activeModal).toEqual({
        kind: "memorizeAction",
        action: "bible-books",
      });
      expect(fixture.nativeElement.textContent).toContain(
        "names of the books of the Bible"
      );
    });

    it("opens practice screenshots when the Memorize verse card is clicked", async () => {
      await component.ngOnInit();
      fixture.detectChanges();
      const memorizeTab = fixture.nativeElement.querySelector(
        "#tour-filter-memorize"
      ) as HTMLButtonElement;
      memorizeTab.click();
      fixture.detectChanges();

      const verseCard = fixture.nativeElement.querySelector(
        'app-info-home-filter-preview-memorize-card button[aria-label="See how verse practice works"]'
      ) as HTMLButtonElement;
      verseCard.click();
      fixture.detectChanges();

      expect(previewModals().activeModal).toEqual({
        kind: "memorizePractice",
      });
      expect(fixture.nativeElement.textContent).toContain("Practice a verse");
      expect(fixture.nativeElement.textContent).toContain("1 of 5");
      expect(
        fixture.nativeElement.querySelector(
          'img[src="/info/memorize-practice/light/01-type.png"]'
        )
      ).toBeTruthy();
    });

    it("opens a Memorize explanation when Add Verses is clicked", async () => {
      await component.ngOnInit();
      fixture.detectChanges();
      const memorizeTab = fixture.nativeElement.querySelector(
        "#tour-filter-memorize"
      ) as HTMLButtonElement;
      memorizeTab.click();
      fixture.detectChanges();

      const addVerses = [...fixture.nativeElement.querySelectorAll("button")].find(
        (button: HTMLButtonElement) => button.textContent?.trim() === "Add Verses"
      ) as HTMLButtonElement;
      addVerses.click();
      fixture.detectChanges();

      expect(previewModals().activeModal).toEqual({
        kind: "memorizeAction",
        action: "add-verses",
      });
      expect(fixture.nativeElement.textContent).toContain("passage picker");
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
