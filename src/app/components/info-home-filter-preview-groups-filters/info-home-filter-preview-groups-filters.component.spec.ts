import { describe, it, expect, beforeEach, afterEach, beforeAll } from "vitest";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { InfoHomeFilterPreviewGroupsFiltersComponent } from "./info-home-filter-preview-groups-filters.component";
import { setupInfoPreviewComponentResources } from "../info-preview-component-resources.spec-helper";

describe("InfoHomeFilterPreviewGroupsFiltersComponent", () => {
  beforeAll(async () => {
    await setupInfoPreviewComponentResources();
  });

  let fixture: ComponentFixture<InfoHomeFilterPreviewGroupsFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfoHomeFilterPreviewGroupsFiltersComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(InfoHomeFilterPreviewGroupsFiltersComponent);
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it("emits openGroupsExplainer when + is clicked", () => {
    const emitted: boolean[] = [];
    fixture.componentInstance.openGroupsExplainer.subscribe(() => emitted.push(true));
    fixture.detectChanges();
    const add = fixture.nativeElement.querySelector(
      'button[aria-label="Add a prayer or group"]'
    ) as HTMLButtonElement;
    add.click();
    expect(emitted).toEqual([true]);
  });

  it("keeps add and status chips on one row without wrap flex hosts", () => {
    fixture.detectChanges();
    const statusRow = fixture.nativeElement.querySelector(
      ".flex.w-full.flex-wrap.items-center.gap-2"
    ) as HTMLElement;
    expect(statusRow).toBeTruthy();
    const addHost = statusRow.querySelector(
      "app-home-sub-filter-chip"
    ) as HTMLElement;
    expect(addHost).toBeTruthy();
    expect(addHost.className).not.toContain("flex-[1_1_0]");
    expect(statusRow.querySelectorAll("app-home-sub-filter-chip")).toHaveLength(
      4
    );
    const addButton = addHost.querySelector("button") as HTMLButtonElement;
    expect(addButton.className).toContain("size-9");
    expect(addButton.className).not.toContain("w-full");
  });

  it("emits selected group chip without opening explainer", () => {
    const chips: string[] = [];
    fixture.componentInstance.selectedGroupChipChange.subscribe((chip) =>
      chips.push(chip)
    );
    fixture.detectChanges();
    const care = [...fixture.nativeElement.querySelectorAll("button")].find(
      (button: HTMLButtonElement) => button.textContent?.includes("Care Team")
    ) as HTMLButtonElement;
    care.click();
    expect(chips).toEqual(["care"]);
  });
});
