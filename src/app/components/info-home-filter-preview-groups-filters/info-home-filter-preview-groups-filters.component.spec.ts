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
