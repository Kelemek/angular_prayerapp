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
import { AdminPendingCountService } from "../../services/admin-pending-count.service";
import { HOME_HEADER_CHIP_SIZE_LOCK_CLASS } from "../../lib/home-sub-filter-chip-classes";
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
  let pendingCount$: BehaviorSubject<number>;
  let handlers: HomeHeaderHandlers;

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

    pendingCount$ = new BehaviorSubject(0);
    handlers = stubHandlers();

    await TestBed.configureTestingModule({
      imports: [HomeHeaderComponent],
      providers: [
        provideRouter([]),
        { provide: BRANDING_SERVICE_TOKEN, useValue: mockBranding },
        {
          provide: AdminPendingCountService,
          useValue: { pendingApprovalItemCount$: pendingCount$ },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeHeaderComponent);
    fixture.componentRef.setInput("showSearchPanel", false);
    fixture.componentRef.setInput("presentationHandoffQueryParams", null);
    fixture.componentRef.setInput("handlers", handlers);
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

  it("marks header toolbar chips for mobile size lock (Pray/Request match icon chips)", () => {
    const root = fixture.nativeElement as HTMLElement;
    const chips = root.querySelectorAll("header .btn-chip");
    expect(chips.length).toBe(5);
    for (const chip of chips) {
      expect(chip.classList.contains(HOME_HEADER_CHIP_SIZE_LOCK_CLASS)).toBe(true);
    }
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

  function settingsButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector(
      `#${TOUR_SETTINGS_BTN_ID}`,
    ) as HTMLButtonElement;
  }

  it("hides the pending badge when the count is 0", () => {
    pendingCount$.next(0);
    fixture.detectChanges();
    const button = settingsButton();
    expect(button.querySelector('[data-testid="admin-pending-badge"]')).toBeNull();
    expect(button.getAttribute("aria-label")).toBe("Settings");
  });

  it("shows the pending approval count on the settings gear", () => {
    pendingCount$.next(4);
    fixture.detectChanges();

    const button = settingsButton();
    const badge = button.querySelector('[data-testid="admin-pending-badge"]');
    expect(badge?.textContent?.trim()).toBe("4");
    expect(button.getAttribute("aria-label")).toBe("Settings, 4 pending approvals");
    expect(button.classList.contains("relative")).toBe(true);
  });

  it("still opens settings when the gear is clicked with a pending badge", () => {
    pendingCount$.next(4);
    fixture.detectChanges();

    settingsButton().click();
    expect(handlers.openUserSettings).toHaveBeenCalledTimes(1);
  });
});
