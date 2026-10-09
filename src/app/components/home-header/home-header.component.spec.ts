import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { ɵresolveComponentResources as resolveComponentResources } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { BehaviorSubject } from "rxjs";
import {
  HomeHeaderComponent,
  HOME_HEADER_LOGO_TOOLBAR_SLOT_CLASS,
} from "./home-header.component";
import {
  BRANDING_SERVICE_TOKEN,
} from "../app-logo/app-logo.component";
import type { BrandingData } from "../../services/branding.service";
import {
  TOUR_BTN_SEARCH_ID,
  TOUR_PRAYER_MODE_BTN_ID,
  TOUR_REQUEST_BTN_ID,
  TOUR_SETTINGS_BTN_ID,
} from "../../lib/help-tour-ids";
import type { HomeHeaderHandlers } from "../../lib/home-header-handlers";

const componentDir = dirname(fileURLToPath(import.meta.url));

function readComponentResource(url: string): string {
  const path = join(componentDir, url);
  if (existsSync(path)) {
    return readFileSync(path, "utf-8");
  }
  throw new Error(`Component resource not found: ${url}`);
}

function stubHandlers(): HomeHeaderHandlers {
  return {
    openLogoutConfirmation: vi.fn(),
    openHelp: vi.fn(),
    toggleSearchPanel: vi.fn(),
    openUserSettings: vi.fn(),
    openPrayerForm: vi.fn(),
    navigateToAdmin: vi.fn(),
    onPresentationLinkClick: vi.fn(),
  };
}

describe("HomeHeaderComponent", () => {
  let fixture: ComponentFixture<HomeHeaderComponent>;
  let brandingSubject: BehaviorSubject<BrandingData>;

  beforeAll(async () => {
    await resolveComponentResources((url) =>
      Promise.resolve(readComponentResource(url))
    );
  });

  beforeEach(async () => {
    brandingSubject = new BehaviorSubject<BrandingData>({
      useLogo: true,
      lightLogo: "data:image/png;base64,light",
      darkLogo: "data:image/png;base64,dark",
      appTitle: "Test Church",
      appSubtitle: "Subtitle hidden on narrow toolbar",
      churchWebsiteUrl: null,
      lastModified: null,
    });

    const mockBranding = {
      initialize: vi.fn(async () => {}),
      branding$: brandingSubject,
      getImageUrl: vi.fn(() => "data:image/png;base64,light"),
      getChurchWebsiteHref: vi.fn(() => null),
    };

    await TestBed.configureTestingModule({
      imports: [HomeHeaderComponent],
      providers: [
        provideRouter([]),
        { provide: BRANDING_SERVICE_TOKEN, useValue: mockBranding },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeHeaderComponent);
    fixture.componentRef.setInput("showSearchPanel", false);
    fixture.componentRef.setInput("presentationHandoffQueryParams", null);
    fixture.componentRef.setInput("handlers", stubHandlers());
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it("renders one toolbar row with a single set of tour anchor ids", () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll(`#${TOUR_BTN_SEARCH_ID}`)).toHaveLength(1);
    expect(root.querySelectorAll(`#${TOUR_SETTINGS_BTN_ID}`)).toHaveLength(1);
    expect(root.querySelectorAll(`#${TOUR_PRAYER_MODE_BTN_ID}`)).toHaveLength(1);
    expect(root.querySelectorAll(`#${TOUR_REQUEST_BTN_ID}`)).toHaveLength(1);
    expect(root.querySelector('[data-testid="home-header-logo-slot"]')).toBeTruthy();
  });

  it("applies fluid logo slot classes so the logo yields space to header chips", () => {
    const slot = fixture.nativeElement.querySelector(
      '[data-testid="home-header-logo-slot"]'
    ) as HTMLElement;
    expect(slot.className).toContain("min-w-0");
    expect(slot.className).toContain("flex-1");
    expect(slot.className).toContain("[&_img]:max-w-full");
    expect(HOME_HEADER_LOGO_TOOLBAR_SLOT_CLASS).toContain("[&_img]:max-h-10");
  });
});
