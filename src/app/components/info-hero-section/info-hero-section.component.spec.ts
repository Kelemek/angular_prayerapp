import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from "vitest";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { ɵresolveComponentResources as resolveComponentResources } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { InfoHeroSectionComponent } from "./info-hero-section.component";

const componentDir = dirname(fileURLToPath(import.meta.url));

function readComponentResource(url: string): string {
  const path = join(componentDir, url);
  if (existsSync(path)) {
    return readFileSync(path, "utf-8");
  }
  throw new Error(`Component resource not found: ${url}`);
}

describe("InfoHeroSectionComponent", () => {
  beforeAll(async () => {
    await resolveComponentResources((url) =>
      Promise.resolve(readComponentResource(url))
    );
  });

  let component: InfoHeroSectionComponent;
  let fixture: ComponentFixture<InfoHeroSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfoHeroSectionComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(InfoHeroSectionComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should set QR URLs on init", () => {
    component.ngOnInit();
    expect(component.webAppQrUrl).toContain("api.qrserver.com");
    expect(component.webAppQrUrl).toContain(
      encodeURIComponent("https://cpprayer.cp-church.org/")
    );
    expect(component.iosStoreQrUrl).toContain("api.qrserver.com");
    expect(component.iosStoreQrUrl).toContain(
      encodeURIComponent(
        "https://apps.apple.com/us/app/cross-pointe-prayer/id6759469929"
      )
    );
  });

  it("openIosStore opens App Store URL", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    component.openIosStore();
    expect(openSpy).toHaveBeenCalledWith(
      "https://apps.apple.com/us/app/cross-pointe-prayer/id6759469929",
      "_blank",
      "noopener"
    );
    openSpy.mockRestore();
  });

  it("openAndroidStore opens Play Store URL", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    component.openAndroidStore();
    expect(openSpy).toHaveBeenCalledWith(
      "https://play.google.com/store/apps/details?id=com.prayerapp.mobile",
      "_blank",
      "noopener"
    );
    openSpy.mockRestore();
  });
});
