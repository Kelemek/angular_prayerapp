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

  it("matches Home: add and status chips share the first chip row", () => {
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll(
      ".flex.w-full.flex-wrap.items-center.gap-2"
    );
    expect(rows).toHaveLength(2);
    const statusRow = rows[0] as HTMLElement;
    expect(
      statusRow.querySelector('button[aria-label="Add a prayer or category"]')
    ).toBeTruthy();
    expect(statusRow.querySelectorAll("app-home-sub-filter-chip")).toHaveLength(
      4
    );
    expect(statusRow.textContent).not.toContain("Health (4)");
    const categoryRow = rows[1] as HTMLElement;
    expect(categoryRow.textContent).toContain("Health (4)");
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
