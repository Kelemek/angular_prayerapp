import { describe, it, expect, beforeEach, afterEach, beforeAll } from "vitest";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { InfoFeatureOverviewComponent } from "./info-feature-overview.component";
import { InfoMockAppHeaderComponent } from "../info-mock-app-header/info-mock-app-header.component";
import type { InfoPreviewModalState } from "../../lib/info-home-filter-preview.types";
import { setupInfoPreviewComponentResources } from "../info-preview-component-resources.spec-helper";

describe("InfoFeatureOverviewComponent", () => {
  beforeAll(async () => {
    await setupInfoPreviewComponentResources();
  });

  let component: InfoFeatureOverviewComponent;
  let fixture: ComponentFixture<InfoFeatureOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfoFeatureOverviewComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InfoFeatureOverviewComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("defaults brandingImageUrl to empty string", () => {
    expect(component.brandingImageUrl).toBe("");
  });

  it("renders mock header, search bar, and filter preview", () => {
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector("app-info-mock-app-header")
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector("app-info-mock-search-bar")
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector("app-info-home-filter-preview-tabs")
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector("app-info-home-filter-preview-panels")
    ).toBeTruthy();
  });

  it("emits preview modal state when a header chip is clicked", () => {
    fixture.detectChanges();

    const emitted: InfoPreviewModalState[] = [];
    component.openPreviewModal.subscribe((value) => emitted.push(value));
    const header = fixture.debugElement.query(
      By.directive(InfoMockAppHeaderComponent)
    ).componentInstance;
    header.openHeaderPreview.emit("settings");

    expect(emitted).toEqual([{ kind: "header", action: "settings" }]);
  });

  it("shows the memorize preview card when Memorize is selected", () => {
    fixture.detectChanges();

    const memorizeTab = fixture.nativeElement.querySelector(
      "#tour-filter-memorize"
    ) as HTMLButtonElement;
    memorizeTab.click();
    fixture.detectChanges();

    expect(component.previewFilter).toBe("memorize");
    expect(
      fixture.nativeElement.querySelector(
        "app-info-home-filter-preview-memorize-card"
      )
    ).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain("John 3:16");
  });

  it("emits a memorize practice preview when the verse card is clicked", () => {
    fixture.detectChanges();

    const emitted: InfoPreviewModalState[] = [];
    component.openPreviewModal.subscribe((value) => emitted.push(value));
    const memorizeTab = fixture.nativeElement.querySelector(
      "#tour-filter-memorize"
    ) as HTMLButtonElement;
    memorizeTab.click();
    fixture.detectChanges();

    const verseCard = fixture.nativeElement.querySelector(
      'app-info-home-filter-preview-memorize-card button[aria-label="See how verse practice works"]'
    ) as HTMLButtonElement;
    verseCard.click();

    expect(emitted).toEqual([{ kind: "memorizePractice" }]);
  });

  it("emits a memorize explanation when Add Verses is clicked", () => {
    fixture.detectChanges();

    const emitted: InfoPreviewModalState[] = [];
    component.openPreviewModal.subscribe((value) => emitted.push(value));
    const memorizeTab = fixture.nativeElement.querySelector(
      "#tour-filter-memorize"
    ) as HTMLButtonElement;
    memorizeTab.click();
    fixture.detectChanges();

    const addVerses = [...fixture.nativeElement.querySelectorAll("button")].find(
      (button: HTMLButtonElement) => button.textContent?.trim() === "Add Verses"
    ) as HTMLButtonElement;
    addVerses.click();

    expect(emitted).toEqual([
      { kind: "memorizeAction", action: "add-verses" },
    ]);
  });

  it("hides the mock search bar until the header search button is clicked", () => {
    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector(
      "#info-mock-search-panel"
    ) as HTMLElement;
    expect(panel.getAttribute("aria-hidden")).toBe("true");
    expect(panel.className).toContain("max-h-0");

    const searchButton = fixture.nativeElement.querySelector(
      'button[title="Search"]'
    ) as HTMLButtonElement;
    searchButton.click();
    fixture.detectChanges();

    expect(component.showSearchPanel).toBe(true);
    expect(panel.getAttribute("aria-hidden")).toBe("false");
    expect(panel.className).toContain("max-h-28");
  });

  it("routes mock search open to preview modals", () => {
    fixture.detectChanges();

    const searchButton = fixture.nativeElement.querySelector(
      'button[title="Search"]'
    ) as HTMLButtonElement;
    searchButton.click();
    fixture.detectChanges();

    const emitted: InfoPreviewModalState[] = [];
    component.openPreviewModal.subscribe((value) => emitted.push(value));
    const searchField = fixture.nativeElement.querySelector(
      "app-info-mock-search-bar .cursor-pointer"
    ) as HTMLElement;
    searchField.click();

    expect(emitted).toEqual([{ kind: "header", action: "search" }]);
  });
});
