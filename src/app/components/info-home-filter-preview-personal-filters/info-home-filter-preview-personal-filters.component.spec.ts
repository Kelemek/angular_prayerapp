import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { InfoHomeFilterPreviewPersonalFiltersComponent } from "./info-home-filter-preview-personal-filters.component";
import { setupInfoPreviewComponentResources } from "../info-preview-component-resources.spec-helper";

describe("InfoHomeFilterPreviewPersonalFiltersComponent", () => {
  beforeAll(async () => {
    await setupInfoPreviewComponentResources();
  });

  let fixture: ComponentFixture<InfoHomeFilterPreviewPersonalFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfoHomeFilterPreviewPersonalFiltersComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(
      InfoHomeFilterPreviewPersonalFiltersComponent
    );
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it("keeps add and status chips on one row", () => {
    fixture.detectChanges();
    const add = fixture.nativeElement.querySelector(
      'button[aria-label="Add a prayer or category"]'
    ) as HTMLButtonElement;
    expect(add).toBeTruthy();
    expect(add.className).toContain("size-9");
    const statusRow = add.closest(
      ".flex.w-full.flex-wrap.items-center.gap-2"
    ) as HTMLElement;
    expect(statusRow?.querySelectorAll("app-home-sub-filter-chip")).toHaveLength(
      4
    );
  });

  it("emits openPersonalCategories when + is clicked", () => {
    const emitted: boolean[] = [];
    fixture.componentInstance.openPersonalCategories.subscribe(() =>
      emitted.push(true)
    );
    fixture.detectChanges();
    const add = fixture.nativeElement.querySelector(
      'button[aria-label="Add a prayer or category"]'
    ) as HTMLButtonElement;
    add.click();
    expect(emitted).toEqual([true]);
  });
});
