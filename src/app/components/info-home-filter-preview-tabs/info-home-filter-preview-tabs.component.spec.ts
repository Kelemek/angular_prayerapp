import { describe, it, expect, beforeEach, afterEach, beforeAll } from "vitest";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { InfoHomeFilterPreviewTabsComponent } from "./info-home-filter-preview-tabs.component";
import { setupInfoPreviewComponentResources } from "../info-preview-component-resources.spec-helper";

describe("InfoHomeFilterPreviewTabsComponent", () => {
  beforeAll(async () => {
    await setupInfoPreviewComponentResources();
  });

  let component: InfoHomeFilterPreviewTabsComponent;
  let fixture: ComponentFixture<InfoHomeFilterPreviewTabsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfoHomeFilterPreviewTabsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InfoHomeFilterPreviewTabsComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("selectPublicPreviewTab emits current when not on community filter", () => {
    const emitted: string[] = [];
    component.previewFilterChange.subscribe((value) => emitted.push(value));
    component.previewFilter = "prompts";

    component.selectPublicPreviewTab();

    expect(emitted).toEqual(["current"]);
  });

  it("selectPublicPreviewTab does nothing when already on community filter", () => {
    const emitted: string[] = [];
    component.previewFilterChange.subscribe((value) => emitted.push(value));
    component.previewFilter = "current";

    component.selectPublicPreviewTab();

    expect(emitted).toEqual([]);
  });

  it("wraps public preview chips with the same flex-wrap host as prompt types", () => {
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll(
      "button"
    ) as NodeListOf<HTMLButtonElement>;
    const publicChips = [...buttons].filter((button) =>
      /^(Current|Answered|Archived|Total|Members) \(/.test(
        button.textContent?.trim() ?? ""
      )
    );
    expect(publicChips).toHaveLength(5);
    for (const button of publicChips) {
      const host = button.parentElement as HTMLElement;
      expect(host.className).toContain("flex-[1_1_0]");
      expect(button.className).toContain("min-w-max");
      expect(button.className).not.toContain("flex-1");
    }
  });

  it("selectPublicPreviewTab does nothing when already on members public filter", () => {
    const emitted: string[] = [];
    component.previewFilterChange.subscribe((value) => emitted.push(value));
    component.previewFilter = "members";

    component.selectPublicPreviewTab();

    expect(emitted).toEqual([]);
  });
});
